package internal

import (
	"math"
	"math/rand"
)

const (
	PitchWidth  = 100.0
	PitchHeight = 68.0
	NumPlayers  = 22
)

type Player struct {
	ID         int
	X          float64
	Y          float64
	VX         float64
	VY         float64
	Team       int
	TargetX    float64
	TargetY    float64
	MaxSpeed   float64
}

func NewPlayers() []*Player {
	players := make([]*Player, NumPlayers)
	for i := 0; i < NumPlayers; i++ {
		team := 0
		x := 25.0 + rand.Float64()*10.0
		if i >= 11 {
			team = 1
			x = 65.0 + rand.Float64()*10.0
		}
		players[i] = &Player{
			ID:       i,
			X:        x,
			Y:        5.0 + rand.Float64()*(PitchHeight-10.0),
			VX:       0,
			VY:       0,
			Team:     team,
			TargetX:  x,
			TargetY:  5.0 + rand.Float64()*(PitchHeight-10.0),
			MaxSpeed: 2.0 + rand.Float64()*3.0,
		}
	}
	return players
}

func (p *Player) Update(dt float64) {
	dx := p.TargetX - p.X
	dy := p.TargetY - p.Y
	dist := math.Sqrt(dx*dx + dy*dy)

	if dist < 2.0 {
		p.TargetX = 5.0 + rand.Float64()*(PitchWidth-10.0)
		p.TargetY = 5.0 + rand.Float64()*(PitchHeight-10.0)
		if p.Team == 0 {
			p.TargetX = math.Min(p.TargetX, 55.0)
		} else {
			p.TargetX = math.Max(p.TargetX, 45.0)
		}
	} else {
		accel := 2.0
		p.VX += (dx / dist) * accel * dt
		p.VY += (dy / dist) * accel * dt

		speed := math.Sqrt(p.VX*p.VX + p.VY*p.VY)
		if speed > p.MaxSpeed {
			p.VX = (p.VX / speed) * p.MaxSpeed
			p.VY = (p.VY / speed) * p.MaxSpeed
		}

		p.VX *= 0.95
		p.VY *= 0.95
	}

	p.X += p.VX * dt
	p.Y += p.VY * dt

	p.X = clamp(p.X, 2.0, PitchWidth-2.0)
	p.Y = clamp(p.Y, 2.0, PitchHeight-2.0)
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
