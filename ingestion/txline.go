package main

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Event is a single SSE message from TxLINE plus the wall-clock time it arrived,
// so recordings can be replayed with realistic pacing.
type Event struct {
	ReceivedAt time.Time `json:"receivedAt"`
	Stream     string    `json:"stream"`
	ID         string    `json:"id,omitempty"`
	Event      string    `json:"event,omitempty"`
	Data       string    `json:"data"`
}

func origin() string {
	if v := os.Getenv("TXLINE_ORIGIN"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "https://txline-dev.txodds.com"
}

// guestToken starts an anonymous guest session. This endpoint lives at the origin
// root, NOT under /api — calling /api/auth/guest/start returns 401.
func guestToken(ctx context.Context) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, origin()+"/auth/guest/start", nil)
	if err != nil {
		return "", err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("guest auth: HTTP %d: %s", resp.StatusCode, body)
	}
	var out struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	if out.Token == "" {
		return "", errors.New("guest auth: empty token in response")
	}
	return out.Token, nil
}

func runLive(ctx context.Context, stream, recordPath string) error {
	if stream != "scores" && stream != "odds" {
		return fmt.Errorf("unknown stream %q (want scores or odds)", stream)
	}

	var rec *recorder
	if recordPath != "" {
		var err error
		rec, err = newRecorder(recordPath)
		if err != nil {
			return err
		}
		defer rec.Close()
		log.Printf("recording to %s", recordPath)
	}

	jwt, err := guestToken(ctx)
	if err != nil {
		return err
	}
	log.Printf("guest session started (%s)", origin())

	url := origin() + "/api/" + stream + "/stream"
	lastEventID := ""
	backoff := time.Second

	connectedOnce := false
	for {
		err := consumeStream(ctx, url, stream, jwt, &lastEventID, func(ev Event) {
			connectedOnce = true  // credentials accepted and data is flowing
			backoff = time.Second // healthy connection: reset reconnect backoff
			printEvent(ev)
			if rec != nil {
				if err := rec.Append(ev); err != nil {
					log.Printf("record: %v", err)
				}
			}
		})
		if ctx.Err() != nil {
			return nil
		}
		var httpErr *httpStatusError
		if errors.As(err, &httpErr) && (httpErr.Code == http.StatusUnauthorized || httpErr.Code == http.StatusForbidden) {
			if !connectedOnce {
				// Credentials were never accepted: a genuine auth gap, not an
				// expired session. Re-authing would loop forever, so bail out
				// with the actionable hint instead.
				return fmt.Errorf("%w\nstream rejected the credentials — the free World Cup tier still requires "+
					"the on-chain subscribe + POST /api/token/activate flow; set TXLINE_API_TOKEN in .env "+
					"(see docs/txline-openapi.yaml)", err)
			}
			// We had a healthy session, so the guest JWT most likely expired
			// mid-run. Mint a fresh one and keep going instead of dying silently
			// (matters for long unattended recordings that must survive a match).
			log.Printf("credentials rejected after a healthy session (%v); refreshing guest token", err)
			if newJWT, aerr := guestToken(ctx); aerr != nil {
				log.Printf("guest re-auth failed (will retry): %v", aerr)
			} else {
				jwt = newJWT
				log.Printf("guest session refreshed")
			}
		}
		log.Printf("stream disconnected (%v), reconnecting in %s", err, backoff)
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(backoff):
		}
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

type httpStatusError struct {
	Code int
	Body string
}

func (e *httpStatusError) Error() string { return fmt.Sprintf("HTTP %d: %s", e.Code, e.Body) }

// consumeStream connects to an SSE endpoint and invokes handle for every complete
// event until the connection drops or ctx is cancelled.
func consumeStream(ctx context.Context, url, stream, jwt string, lastEventID *string, handle func(Event)) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+jwt)
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")
	if tok := os.Getenv("TXLINE_API_TOKEN"); tok != "" {
		req.Header.Set("X-Api-Token", tok)
	}
	if *lastEventID != "" {
		req.Header.Set("Last-Event-ID", *lastEventID)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return &httpStatusError{Code: resp.StatusCode, Body: strings.TrimSpace(string(body))}
	}
	log.Printf("connected to %s", url)

	sc := bufio.NewScanner(resp.Body)
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var id, event string
	var data []string
	flush := func() {
		if len(data) == 0 {
			id, event, data = "", "", nil
			return
		}
		ev := Event{
			ReceivedAt: time.Now().UTC(),
			Stream:     stream,
			ID:         id,
			Event:      event,
			Data:       strings.Join(data, "\n"),
		}
		if id != "" {
			*lastEventID = id
		}
		handle(ev)
		id, event, data = "", "", nil
	}

	for sc.Scan() {
		line := sc.Text()
		switch {
		case line == "":
			flush()
		case strings.HasPrefix(line, ":"):
			// comment / keep-alive
		case strings.HasPrefix(line, "id:"):
			id = strings.TrimSpace(strings.TrimPrefix(line, "id:"))
		case strings.HasPrefix(line, "event:"):
			event = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
		case strings.HasPrefix(line, "data:"):
			data = append(data, strings.TrimSpace(strings.TrimPrefix(line, "data:")))
		}
	}
	if err := sc.Err(); err != nil {
		return err
	}
	return errors.New("stream closed by server")
}

func printEvent(ev Event) {
	data := ev.Data
	if len(data) > 160 {
		data = data[:160] + "…"
	}
	name := ev.Event
	if name == "" {
		name = "message"
	}
	log.Printf("[%s] %-6s %-12s %s", ev.ReceivedAt.Format("15:04:05.000"), ev.Stream, name, data)
}
