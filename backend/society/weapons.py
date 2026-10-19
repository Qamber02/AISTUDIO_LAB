from typing import Dict, Any, List

WEAPONS_CATALOG: Dict[str, Dict[str, Any]] = {
    "plasma_blade": {
        "id": "plasma_blade",
        "name": "Plasma Void Blade",
        "tier": "Rare",
        "type": "Melee",
        "attack": 28,
        "defense": 8,
        "special": "Critical Strike (Chance for 2x damage)",
        "craft_cost": {"crystals": 30, "cores": 1},
        "color": "#06b6d4",
        "icon": "⚔️"
    },
    "quantum_staff": {
        "id": "quantum_staff",
        "name": "Quantum Resonance Staff",
        "tier": "Mythic",
        "type": "Magic/Energy",
        "attack": 22,
        "defense": 16,
        "special": "Resonance Pulse (Stuns target for 2 turns)",
        "craft_cost": {"crystals": 45, "cores": 2},
        "color": "#8b5cf6",
        "icon": "🪄"
    },
    "chrono_shield": {
        "id": "chrono_shield",
        "name": "Chrono Aegis Shield",
        "tier": "Rare",
        "type": "Defense",
        "attack": 12,
        "defense": 32,
        "special": "Time Dilation (Reflects 35% damage)",
        "craft_cost": {"crystals": 35, "cores": 1},
        "color": "#3b82f6",
        "icon": "🛡️"
    },
    "cipher_bow": {
        "id": "cipher_bow",
        "name": "Cipher Longbow",
        "tier": "Rare",
        "type": "Ranged",
        "attack": 30,
        "defense": 6,
        "special": "Predictive Trajectory (Ignores armor)",
        "craft_cost": {"crystals": 32, "cores": 1},
        "color": "#10b981",
        "icon": "🏹"
    },
    "singularity_orb": {
        "id": "singularity_orb",
        "name": "Singularity Gravity Orb",
        "tier": "Singularity",
        "type": "Relic",
        "attack": 42,
        "defense": 24,
        "special": "Gravity Well (Disrupts council voting balance)",
        "craft_cost": {"crystals": 80, "cores": 4},
        "color": "#ec4899",
        "icon": "🔮"
    },
    "nanite_scepter": {
        "id": "nanite_scepter",
        "name": "Nanite Hive Scepter",
        "tier": "Mythic",
        "type": "Support",
        "attack": 15,
        "defense": 22,
        "special": "Cellular Regeneration (+15 HP per cycle)",
        "craft_cost": {"crystals": 40, "cores": 2},
        "color": "#14b8a6",
        "icon": "🧪"
    },
    "kinetic_flail": {
        "id": "kinetic_flail",
        "name": "Kinetic Breaker Flail",
        "tier": "Common",
        "type": "Melee",
        "attack": 18,
        "defense": 10,
        "special": "Armor Breaker",
        "craft_cost": {"crystals": 15, "cores": 0},
        "color": "#f59e0b",
        "icon": "🔨"
    },
    "disruptor_dagger": {
        "id": "disruptor_dagger",
        "name": "Phase Disruptor Dagger",
        "tier": "Common",
        "type": "Stealth",
        "attack": 20,
        "defense": 4,
        "special": "Stealth Ambush",
        "craft_cost": {"crystals": 12, "cores": 0},
        "color": "#ef4444",
        "icon": "🗡️"
    }
}
