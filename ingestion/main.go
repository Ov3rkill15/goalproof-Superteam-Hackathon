// Command ingestion consumes TxLINE SSE feeds (scores/odds), prints every event
// and optionally records them as JSONL for later replay.
//
//	go run . --mode live --stream scores --record recordings/scores.jsonl
//	go run . --mode replay --file recordings/scores.jsonl --speed 10
package main

import (
	"bytes"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
)

func main() {
	log.SetFlags(0)

	mode := flag.String("mode", "live", "live | replay")
	stream := flag.String("stream", "scores", "scores | odds (live mode)")
	record := flag.String("record", "", "JSONL file to record events to (live mode)")
	file := flag.String("file", "", "JSONL recording to replay (replay mode)")
	speed := flag.Float64("speed", 1.0, "replay speed multiplier")
	flag.Parse()

	loadDotEnv("../.env")
	loadDotEnv(".env")

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var err error
	switch *mode {
	case "live":
		err = runLive(ctx, *stream, *record)
	case "replay":
		err = runReplay(ctx, *file, *speed)
	default:
		err = fmt.Errorf("unknown mode %q (want live or replay)", *mode)
	}
	if err != nil && ctx.Err() == nil {
		log.Fatal(err)
	}
}

// loadDotEnv sets variables from a .env file without overriding the real environment.
// Strips a UTF-8 BOM first: editors sneak one in and it silently corrupts the first key.
func loadDotEnv(path string) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return
	}
	raw = bytes.TrimPrefix(raw, []byte{0xEF, 0xBB, 0xBF})
	for _, line := range strings.Split(string(raw), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		if os.Getenv(key) == "" {
			os.Setenv(key, strings.TrimSpace(val))
		}
	}
}
