package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

// recorder appends events to a JSONL file, one Event per line.
type recorder struct {
	f *os.File
	w *bufio.Writer
}

func newRecorder(path string) (*recorder, error) {
	if dir := filepath.Dir(path); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, err
		}
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return nil, err
	}
	return &recorder{f: f, w: bufio.NewWriter(f)}, nil
}

func (r *recorder) Append(ev Event) error {
	b, err := json.Marshal(ev)
	if err != nil {
		return err
	}
	if _, err := r.w.Write(append(b, '\n')); err != nil {
		return err
	}
	// flush per event: a crash must not lose the tail of a match recording
	return r.w.Flush()
}

func (r *recorder) Close() error {
	r.w.Flush()
	return r.f.Close()
}

// runReplay re-emits a recorded JSONL file, preserving inter-event gaps divided by
// speed. This is what keeps the demo alive after the tournament ends.
func runReplay(ctx context.Context, path string, speed float64) error {
	if path == "" {
		return fmt.Errorf("replay mode needs --file")
	}
	if speed <= 0 {
		return fmt.Errorf("--speed must be > 0")
	}
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var prev time.Time
	n := 0
	for sc.Scan() {
		if ctx.Err() != nil {
			return nil
		}
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		var ev Event
		if err := json.Unmarshal(line, &ev); err != nil {
			log.Printf("skipping bad line: %v", err)
			continue
		}
		if !prev.IsZero() {
			gap := time.Duration(float64(ev.ReceivedAt.Sub(prev)) / speed)
			if gap > 0 {
				select {
				case <-ctx.Done():
					return nil
				case <-time.After(gap):
				}
			}
		}
		prev = ev.ReceivedAt
		printEvent(ev)
		n++
	}
	log.Printf("replay finished: %d events", n)
	return sc.Err()
}
