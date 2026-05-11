class_name TestHandManager
extends Node2D

@onready var hand_manager: HandManager = $HandManager
@onready var info_label: Label = $UI/InfoLabel
@onready var add_btn: Button = $UI/AddCardBtn
@onready var add_5_btn: Button = $UI/Add5Btn
@onready var remove_btn: Button = $UI/RemoveBtn
@onready var shuffle_btn: Button = $UI/ShuffleBtn
@onready var clear_btn: Button = $UI/ClearBtn

var card_colors: Array[Color] = [
	Color(0.94, 0.76, 0.05),
	Color(0.90, 0.29, 0.22),
	Color(0.15, 0.68, 0.38),
	Color(0.20, 0.60, 0.86),
	Color(0.61, 0.35, 0.71),
	Color(0.96, 0.51, 0.19),
	Color(0.04, 0.82, 0.78),
	Color(0.85, 0.37, 0.61),
	Color(0.55, 0.27, 0.07),
	Color(0.37, 0.51, 0.28)
]

var card_prefab: PackedScene = null

func _ready() -> void:
	card_prefab = load("res://scenes/card_ui.tscn")
	if card_prefab:
		hand_manager.set_card_prefab(card_prefab)
	
	_connect_buttons()
	_connect_hand_signals()
	_update_info()

func _process(delta: float) -> void:
	if Input.is_action_just_pressed("ui_accept"):
		_on_add_card_pressed()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_A:
				_on_add_card_pressed()
			KEY_S:
				_on_add_5_cards_pressed()
			KEY_D:
				_on_remove_card_pressed()
			KEY_R:
				_on_shuffle_pressed()
			KEY_C:
				_on_clear_pressed()

func _connect_buttons() -> void:
	add_btn.pressed.connect(_on_add_card_pressed)
	add_5_btn.pressed.connect(_on_add_5_cards_pressed)
	remove_btn.pressed.connect(_on_remove_card_pressed)
	shuffle_btn.pressed.connect(_on_shuffle_pressed)
	clear_btn.pressed.connect(_on_clear_pressed)

func _connect_hand_signals() -> void:
	hand_manager.card_added.connect(_on_card_added)
	hand_manager.card_removed.connect(_on_card_removed)
	hand_manager.card_hovered.connect(_on_card_hovered)
	hand_manager.card_clicked.connect(_on_card_clicked)

func _on_add_card_pressed() -> void:
	var card: CardUI = hand_manager.add_card()
	if card:
		_colorize_card(card, hand_manager.get_card_count() - 1)
	_update_info()

func _on_add_5_cards_pressed() -> void:
	var added: Array[CardUI] = hand_manager.add_cards(5)
	for i in range(added.size()):
		_colorize_card(added[i], hand_manager.get_card_count() - added.size() + i)
	_update_info()

func _on_remove_card_pressed() -> void:
	hand_manager.remove_card_by_index(hand_manager.get_card_count() - 1, true)
	_update_info()

func _on_shuffle_pressed() -> void:
	hand_manager.shuffle_cards()

func _on_clear_pressed() -> void:
	hand_manager.clear_hand(true)
	_update_info()

func _on_card_added(card: CardUI) -> void:
	print("Card added, total: ", hand_manager.get_card_count())

func _on_card_removed(card: CardUI) -> void:
	print("Card removed, total: ", hand_manager.get_card_count())

func _on_card_hovered(card: CardUI) -> void:
	print("Hovering over card: ", card.card_id)

func _on_card_clicked(card: CardUI) -> void:
	print("Card clicked: ", card.card_id)
	hand_manager.remove_card(card, true)
	_update_info()

func _colorize_card(card: CardUI, index: int) -> void:
	if card and not card_colors.is_empty():
		var color_index: int = index % card_colors.size()
		var bg_color: Color = card_colors[color_index]
		var border_color: Color = bg_color.darkened(0.4)
		card.set_card_colors(bg_color, border_color)

func _update_info() -> void:
	if info_label:
		info_label.text = "Cards in hand: %d / %d" % [hand_manager.get_card_count(), hand_manager.max_cards]
