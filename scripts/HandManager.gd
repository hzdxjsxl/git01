class_name HandManager
extends Control

signal card_added(card: CardUI)
signal card_removed(card: CardUI)
signal card_hovered(card: CardUI)
signal card_clicked(card: CardUI)

@export var max_cards: int = 10
@export var card_width: float = 100.0
@export var card_height: float = 140.0
@export var card_prefab: PackedScene
@export var animation_delay_between_cards: float = 0.1

@export_category("Fan Layout Settings")
@export var arc_radius: float = 400.0
@export var max_angle_deg: float = 90.0
@export var y_offset: float = 50.0

@export_category("Hover Settings")
@export var hover_offset: Vector2 = Vector2(0, -30.0)
@export var hover_scale: float = 1.15

var cards: Array[CardUI] = []
var layout_math: FanLayoutMath
var canvas_width: float = 800.0

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	_init_layout_math()

func _init_layout_math() -> void:
	layout_math = FanLayoutMath.new()
	layout_math.arc_radius = arc_radius
	layout_math.max_angle_deg = max_angle_deg
	layout_math.card_width = card_width
	layout_math.card_height = card_height
	layout_math.y_offset = y_offset

func add_card(card_data: Dictionary = {}, animate: bool = true) -> CardUI:
	if cards.size() >= max_cards:
		push_warning("Hand is full! Cannot add more cards.")
		return null
	
	var new_card: CardUI = _create_card_instance()
	if new_card == null:
		return null
	
	new_card.card_id = randi()
	new_card.card_data = card_data
	new_card.hover_offset = hover_offset
	new_card.hover_scale = hover_scale
	
	_connect_card_signals(new_card)
	
	add_child(new_card)
	cards.append(new_card)
	
	if animate:
		var start_pos: Vector2 = Vector2(-card_width, size.y + card_height)
		var delay: float = animation_delay_between_cards * float(cards.size() - 1)
		new_card.set_target_state(Vector2.ZERO, 0.0, 1.0, cards.size() - 1, false)
		new_card.animate_draw_from_pile(start_pos, delay)
	else:
		new_card.set_target_state(Vector2.ZERO, 0.0, 1.0, cards.size() - 1, false)
	
	card_added.emit(new_card)
	update_layout(animate)
	
	return new_card

func add_cards(count: int, animate: bool = true) -> Array[CardUI]:
	var added_cards: Array[CardUI] = []
	for i in range(count):
		var card: CardUI = add_card({}, animate)
		if card:
			added_cards.append(card)
		else:
			break
	return added_cards

func remove_card(card: CardUI, animate: bool = true) -> bool:
	var idx: int = cards.find(card)
	if idx == -1:
		return false
	
	_disconnect_card_signals(card)
	cards.remove_at(idx)
	card_removed.emit(card)
	card.destroy(animate)
	
	update_layout(animate)
	return true

func remove_card_by_index(index: int, animate: bool = true) -> bool:
	if index < 0 or index >= cards.size():
		return false
	
	return remove_card(cards[index], animate)

func clear_hand(animate: bool = true) -> void:
	for card in cards:
		_disconnect_card_signals(card)
		card.destroy(animate)
	cards.clear()

func update_layout(animate: bool = true) -> void:
	if cards.is_empty():
		return
	
	var count: int = cards.size()
	layout_math.set_canvas_center(size.x / 2.0, size.y)
	
	var positions: Array[Vector2] = layout_math.get_card_positions(count, canvas_width)
	var rotations: Array[float] = layout_math.get_card_rotations(count)
	var scales: Array[float] = layout_math.get_card_scales(count)
	
	for i in range(count):
		var card: CardUI = cards[i]
		var z_index: int = i
		
		card.set_target_state(
			positions[i],
			rotations[i],
			scales[i],
			z_index,
			animate
		)

func _create_card_instance() -> CardUI:
	if card_prefab:
		var instance: Node = card_prefab.instantiate()
		if instance is CardUI:
			return instance
	
	var fallback_card: CardUI = CardUI.new()
	fallback_card.size = Vector2(card_width, card_height)
	return fallback_card

func _connect_card_signals(card: CardUI) -> void:
	card.hover_started.connect(_on_card_hover_started)
	card.hover_ended.connect(_on_card_hover_ended)
	card.card_clicked.connect(_on_card_clicked)

func _disconnect_card_signals(card: CardUI) -> void:
	if card.hover_started.is_connected(_on_card_hover_started):
		card.hover_started.disconnect(_on_card_hover_started)
	if card.hover_ended.is_connected(_on_card_hover_ended):
		card.hover_ended.disconnect(_on_card_hover_ended)
	if card.card_clicked.is_connected(_on_card_clicked):
		card.card_clicked.disconnect(_on_card_clicked)

func _on_card_hover_started(card: CardUI) -> void:
	card_hovered.emit(card)

func _on_card_hover_ended(card: CardUI) -> void:
	pass

func _on_card_clicked(card: CardUI) -> void:
	card_clicked.emit(card)

func get_card_count() -> int:
	return cards.size()

func get_card(index: int) -> CardUI:
	if index >= 0 and index < cards.size():
		return cards[index]
	return null

func get_all_cards() -> Array[CardUI]:
	return cards.duplicate()

func shuffle_cards() -> void:
	cards.shuffle()
	update_layout(true)

func set_card_prefab(prefab: PackedScene) -> void:
	card_prefab = prefab

func set_arc_radius(radius: float) -> void:
	arc_radius = radius
	if layout_math:
		layout_math.arc_radius = radius
	update_layout()

func set_max_angle(angle_deg: float) -> void:
	max_angle_deg = angle_deg
	if layout_math:
		layout_math.max_angle_deg = angle_deg
	update_layout()

func set_canvas_width(width: float) -> void:
	canvas_width = width
	update_layout()

func _resized() -> void:
	canvas_width = size.x
	update_layout()
