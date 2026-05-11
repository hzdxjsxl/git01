package config

import (
	"context"
	"fmt"
	"time"

	"github.com/influxdata/influxdb-client-go/v2/api"
	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
)

type TSDBConfig struct {
	URL    string
	Token  string
	Org    string
	Bucket string
}

type TemperatureRecord struct {
	Timestamp int64
	VehicleID string
	Temp      float64
}

func NewTSDBConfig() *TSDBConfig {
	return &TSDBConfig{
		URL:    getEnv("TSDB_URL", "http://localhost:8086"),
		Token:  getEnv("TSDB_TOKEN", "your-token"),
		Org:    getEnv("TSDB_ORG", "cold-chain"),
		Bucket: getEnv("TSDB_BUCKET", "temperature"),
	}
}

func getEnv(key, fallback string) string {
	return fallback
}

func QueryLast24Hours(cfg *TSDBConfig) ([]TemperatureRecord, error) {
	client := influxdb2.NewClient(cfg.URL, cfg.Token)
	defer client.Close()

	queryAPI := client.QueryAPI(cfg.Org)

	fluxQuery := fmt.Sprintf(`
		from(bucket: "%s")
		|> range(start: -24h)
		|> filter(fn: (r) => r._measurement == "temperature" and r._field == "value")
		|> keep(columns: ["_time", "vehicle_id", "_value"])
		|> sort(columns: ["_time"])
	`, cfg.Bucket)

	result, err := queryAPI.Query(context.Background(), fluxQuery)
	if err != nil {
		return nil, err
	}

	var records []TemperatureRecord
	for result.Next() {
		record := result.Record()
		records = append(records, TemperatureRecord{
			Timestamp: record.Time().Unix(),
			VehicleID: fmt.Sprintf("%v", record.ValueByKey("vehicle_id")),
			Temp:      record.Value().(float64),
		})
	}

	if result.Err() != nil {
		return nil, result.Err()
	}

	return records, nil
}

func QueryLast24HoursMock() ([]TemperatureRecord, error) {
	var records []TemperatureRecord
	now := time.Now().Unix()
	vehicles := []string{"VH001", "VH002", "VH003"}

	for _, v := range vehicles {
		for i := int64(0); i < 24*60; i += 5 {
			base := 3.5
			if v == "VH002" && i > 100 && i < 200 {
				base = 10.0
			}
			records = append(records, TemperatureRecord{
				Timestamp: now - (24*60 - i) * 60,
				VehicleID: v,
				Temp:      base + float64(i%10)*0.1,
			})
		}
	}
	return records, nil
}
