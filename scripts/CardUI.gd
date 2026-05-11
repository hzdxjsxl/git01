class_name CardUI
extends Control

signal hover_started(card: CardUI)
signal hover_ended(card: CardUI)
signal card_clicked(card: CardUI)

var target_position: Vector2 = Vector2.ZERO
var target_rotation: float = 0.0
var target_scale: float = 1.0
var target_z_index: int = 0

var is_hovered: bool = false
var hover_offset: Vector2 = Vector2(0, -30.0)
var hover_scale: float = 1.15
var hover_z_index: int = 100

var animation_duration: float = 0.25
var animation_ease: Tween.EaseType = Tween.EASE_OUT
var animation_trans: Tween.TransitionType = Tween.TRANS_CUBIC

var card_id: int = 0
var card_data: Dictionary = {}

var _current_tween: Tween = null
var _base_color: Color = Color(1, 1, 1, 1)

@onready var card_texture: TextureRect = $CardTexture
@onready var background_panel: Panel = $Background

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	
	if background_panel:
		background_panel.gui_input.connect(_on_gui_input)
		background_panel.mouse_entered.connect(_on_mouse_entered)
		background_panel.mouse_exited.connect(_on_mouse_exited)

func _on_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			card_clicked.emit(self)

func _on_mouse_entered() -> void:
	if is_hovered:
		return
	is_hovered = true
	hover_started.emit(self)
	apply_hover_effect()

func _on_mouse_exited() -> void:
	if not is_hovered:
		return
	is_hovered = false
	hover_ended.emit(self)
	remove_hover_effect()

func set_target_state(pos: Vector2, rot: float, scale: float, z_idx: int, animate: bool = true) -> void:
	target_position = pos
	target_rotation = rot
	target_scale = scale
	target_z_index = z_idx
	
	if animate:
		animate_to_target()
	else:
		position = pos
		rotation_degrees = rot
		scale = Vector2(scale, scale)
		z_index = z_idx

func animate_to_target() -> void:
	_stop_current_tween()
	
	_current_tween = create_tween()
	_current_tween.set_ease(animation_ease)
	_current_tween.set_trans(animation_trans)
	
	var final_pos: Vector2
	var final_scale: Vector2
	var final_rot: float
	
	if is_hovered:
		final_pos = target_position + hover_offset
		final_scale = Vector2(hover_scale, hover_scale)
		final_rot = 0.0
	else:
		final_pos = target_position
		final_scale = Vector2(target_scale, target_scale)
		final_rot = target_rotation
	
	_current_tween.parallel().tween_property(self, "position", final_pos, animation_duration)
	_current_tween.parallel().tween_property(self, "rotation_degrees", final_rot, animation_duration)
	_current_tween.parallel().tween_property(self, "scale", final_scale, animation_duration)
	
	_current_tween.play()
	
	z_index = hover_z_index if is_hovered else target_z_index

func apply_hover_effect() -> void:
	_stop_current_tween()
	
	_current_tween = create_tween()
	_current_tween.set_ease(animation_ease)
	_current_tween.set_trans(animation_trans)
	
	_current_tween.parallel().tween_property(self, "position", target_position + hover_offset, animation_duration)
	_current_tween.parallel().tween_property(self, "rotation_degrees", 0.0, animation_duration)
	_current_tween.parallel().tween_property(self, "scale", Vector2(hover_scale, hover_scale), animation_duration)
	
	_current_tween.play()
	
	z_index = hover_z_index

func remove_hover_effect() -> void:
	_stop_current_tween()
	
	_current_tween = create_tween()
	_current_tween.set_ease(animation_ease)
	_current_tween.set_trans(animation_trans)
	
	_current_tween.parallel().tween_property(self, "position", target_position, animation_duration)
	_current_tween.parallel().tween_property(self, "rotation_degrees", target_rotation, animation_duration)
	_current_tween.parallel().tween_property(self, "scale", Vector2(target_scale, target_scale), animation_duration)
	
	_current_tween.play()
	
	z_index = target_z_index

func _stop_current_tween() -> void:
	if _current_tween and _current_tween.is_valid():
		_current_tween.kill()
	_current_tween = null

func set_card_texture(texture: Texture2D) -> void:
	if card_texture:
		card_texture.texture = texture

func set_card_colors(bg_color: Color, border_color: Color = Color.BLACK) -> void:
	if background_panel:
		var style: StyleBoxFlat = background_panel.get_theme_stylebox("panel")
		if style:
			var new_style: StyleBoxFlat = style.duplicate()
			new_style.bg_color = bg_color
			new_style.border_color = border_color
			background_panel.add_theme_stylebox_override("panel", new_style)

func animate_draw_from_pile(start_pos: Vector2, delay: float = 0.0) -> void:
	position = start_pos
	scale = Vector2.ZERO
	rotation_degrees = 0.0
	z_index = hover_z_index
	
	_stop_current_tween()
	_current_tween = create_tween()
	_current_tween.set_ease(Tween.EASE_OUT)
	_current_tween.set_trans(Tween.TRANS_BACK)
	_current_tween.set_delay(delay)
	
	_current_tween.parallel().tween_property(self, "position", target_position, animation_duration)
	_current_tween.parallel().tween_property(self, "rotation_degrees", target_rotation, animation_duration)
	_current_tween.parallel().tween_property(self, "scale", Vector2(target_scale, target_scale), animation_duration)
	
	_current_tween.finished.connect(_on_draw_animation_finished)
	_current_tween.play()

func _on_draw_animation_finished() -> void:
	z_index = target_z_index

func destroy(with_animation: bool = false) -> void:
	if with_animation:
		_stop_current_tween()
		_current_tween = create_tween()
		_current_tween.set_ease(Tween.EASE_IN)
		_current_tween.set_trans(Tween.TRANS_CUBIC)
		_current_tween.tween_property(self, "scale", Vector2.ZERO, animation_duration)
		_current_tween.tween_property(self, "opacity", 0.0, animation_duration)
		_current_tween.finished.connect(queue_free)
		_current_tween.play()
	else:
		queue_free()
