package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"football-heatmap-backend/internal"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Hub struct {
	clients    map[*websocket.Conn]bool
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	broadcast  chan []byte
	mu         sync.Mutex
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]bool),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		broadcast:  make(chan []byte, 256),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("Write error: %v", err)
					client.Close()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

type PositionData struct {
	ID    int     `json:"id"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Team  int     `json:"team"`
	Time  int64   `json:"time"`
}

func getPort(defaultPort int) int {
	envPort := os.Getenv("PORT")
	if envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			return p
		}
	}
	return defaultPort
}

func checkPortAvailable(port int) bool {
	ln, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return false
	}
	ln.Close()
	return true
}

func findAvailablePort(startPort int) int {
	port := startPort
	for !checkPortAvailable(port) {
		log.Printf("Port %d is busy, trying port %d...", port, port+1)
		port++
	}
	return port
}

func main() {
	hub := newHub()
	go hub.run()

	players := internal.NewPlayers()
	lastTime := time.Now()

	go func() {
		ticker := time.NewTicker(1000 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			dt := now.Sub(lastTime).Seconds()
			lastTime = now

			for _, p := range players {
				p.Update(dt)
			}

			positions := make([]PositionData, len(players))
			for i, p := range players {
				positions[i] = PositionData{
					ID:    p.ID,
					X:     p.X,
					Y:     p.Y,
					Team:  p.Team,
					Time:  now.UnixMilli(),
				}
			}

			data, err := json.Marshal(positions)
			if err != nil {
				log.Printf("JSON marshal error: %v", err)
				continue
			}

			hub.broadcast <- data
		}
	}()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("Upgrade error: %v", err)
			return
		}
		hub.register <- conn

		defer func() {
			hub.unregister <- conn
		}()

		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	})

	startPort := getPort(8080)
	port := findAvailablePort(startPort)

	log.Printf("Football Heatmap Server running on port %d", port)
	log.Printf("WebSocket endpoint: ws://localhost:%d/ws", port)

	if err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
