class_name FanLayoutMath
extends RefCounted

var max_angle_deg: float = 90.0
var min_card_spacing: float = 80.0
var card_width: float = 100.0
var card_height: float = 140.0
var arc_radius: float = 400.0
var y_offset: float = 0.0
var x_offset: float = 0.0
var canvas_center_x: float = 400.0
var canvas_bottom_y: float = 600.0

func _init() -> void:
	pass

func set_canvas_center(center_x: float, bottom_y: float) -> void:
	canvas_center_x = center_x
	canvas_bottom_y = bottom_y

func get_card_positions(count: int, canvas_width: float = 800.0) -> Array[Vector2]:
	if count <= 0:
		return []
	
	var positions: Array[Vector2] = []
	var angles: Array[float] = _calculate_angles(count)
	
	for i in range(count):
		var angle_rad: float = deg_to_rad(angles[i])
		var pos: Vector2 = Vector2(
			arc_radius * sin(angle_rad),
			-arc_radius * cos(angle_rad)
		)
		pos.x += canvas_center_x
		pos.y += canvas_bottom_y - y_offset
		positions.append(pos)
	
	return positions

func get_card_rotations(count: int) -> Array[float]:
	if count <= 0:
		return []
	return _calculate_angles(count)

func get_card_scales(count: int) -> Array[float]:
	if count <= 0:
		return []
	
	var scales: Array[float] = []
	var center: float = float(count - 1) / 2.0
	
	for i in range(count):
		var dist_from_center: float = abs(float(i) - center) / max(1.0, float(count - 1) / 2.0)
		var scale: float = 1.0 - dist_from_center * 0.05
		scales.append(scale)
	
	return scales

func _calculate_angles(count: int) -> Array[float]:
	var angles: Array[float] = []
	
	if count == 1:
		angles.append(0.0)
		return angles
	
	var total_spread: float = _get_total_spread(count)
	var step: float = total_spread / float(count - 1)
	var start_angle: float = -total_spread / 2.0
	
	for i in range(count):
		angles.append(start_angle + step * float(i))
	
	return angles

func _get_total_spread(count: int) -> float:
	var spread_based_on_cards: float = float(count - 1) * 12.0
	var min_spread: float = 30.0
	var clamped_spread: float = clamp(spread_based_on_cards, min_spread, max_angle_deg)
	return clamped_spread

func get_hover_offset() -> Vector2:
	return Vector2(0, -30.0)

func get_hover_scale() -> float:
	return 1.15

func get_default_transition_duration() -> float:
	return 0.25

func get_transition_ease() -> Tween.EaseType:
	return Tween.EASE_OUT

func get_transition_trans() -> Tween.TransitionType:
	return Tween.TRANS_CUBIC
