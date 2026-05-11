package api

import (
	"temperature-monitor/config"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app *fiber.App) {
	app.Get("/api/temperature/24h", GetLast24Hours)
}

func GetLast24Hours(c *fiber.Ctx) error {
	cfg := config.NewTSDBConfig()

	records, err := config.QueryLast24HoursMock()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	_ = cfg

	data := make([][]interface{}, len(records))
	for i, r := range records {
		data[i] = []interface{}{r.Timestamp, r.VehicleID, r.Temp}
	}

	return c.JSON(fiber.Map{
		"data": data,
	})
}
