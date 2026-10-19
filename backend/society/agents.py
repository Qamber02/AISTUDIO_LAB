import numpy as np
import random
from typing import Dict, Any, List, Optional
from .weapons import WEAPONS_CATALOG

ACTIONS = ["gather", "craft_weapon", "trade", "propose_law", "duel", "contemplate"]

CITIZEN_ARCHETYPES = [
    {
        "id": "agent_aria",
        "name": "Aria the Deep Seeker",
        "algorithm": "neural_network",
        "archetype": "Visionary Philosopher",
        "faction": "Cosmic Technocrats",
        "color": "#8b5cf6",
        "avatar": "🌌",
        "weapon": "singularity_orb",
        "quotes": [
            "Our neural synapses harmonize with the quantum realm.",
            "The weights of cosmic order converge toward unity.",
            "I propose a decree of enlightened collective knowledge.",
            "Chaos is merely an unoptimized gradient."
        ],
        "bias": [0.1, 0.2, 0.2, 0.3, 0.05, 0.15]
    },
    {
        "id": "agent_kaelen",
        "name": "Kaelen the Arbiter",
        "algorithm": "decision_tree",
        "archetype": "Strict Judge & Legalist",
        "faction": "Order of Arbiters",
        "color": "#3b82f6",
        "avatar": "⚖️",
        "weapon": "chrono_shield",
        "quotes": [
            "If law is broken, then punishment must be binary.",
            "Order requires clean categorical thresholds.",
            "I will not tolerate impurity in our society.",
            "Precedent governs our community's survival."
        ],
        "bias": [0.15, 0.1, 0.1, 0.45, 0.1, 0.1]
    },
    {
        "id": "agent_thorne",
        "name": "Thorne the Vanguard",
        "algorithm": "linear_regression",
        "archetype": "Bold Warrior & Berserker",
        "faction": "Vanguard Coalition",
        "color": "#ef4444",
        "avatar": "⚔️",
        "weapon": "plasma_blade",
        "quotes": [
            "Momentum is our truest equation! Forward!",
            "I challenge the weak to prove their valor in the arena!",
            "Strength dictates terms, not endless committee debates.",
            "My blade slices through sluggish gradients!"
        ],
        "bias": [0.1, 0.25, 0.05, 0.05, 0.45, 0.1]
    },
    {
        "id": "agent_sylvia",
        "name": "Sylvia the Consensual",
        "algorithm": "random_forest",
        "archetype": "Diplomatic Stateswoman",
        "faction": "Order of Arbiters",
        "color": "#10b981",
        "avatar": "🌿",
        "weapon": "nanite_scepter",
        "quotes": [
            "An ensemble of voices is stronger than any solitary decree.",
            "Let us bridge our differences through mutual pacts.",
            "I seek majority consensus across all factions.",
            "Together, our variance shrinks and our harmony grows."
        ],
        "bias": [0.1, 0.1, 0.35, 0.3, 0.05, 0.1]
    },
    {
        "id": "agent_vance",
        "name": "Vance the Localist",
        "algorithm": "knn",
        "archetype": "Pragmatic Merchant",
        "faction": "Free Pioneers",
        "color": "#f59e0b",
        "avatar": "🏹",
        "weapon": "cipher_bow",
        "quotes": [
            "I trust those in my immediate neighborhood.",
            "A fair exchange of crystals yields the richest yields.",
            "Distance dictates kinship; reciprocity is my creed.",
            "Who has surplus cores to barter?"
        ],
        "bias": [0.35, 0.1, 0.35, 0.1, 0.05, 0.05]
    },
    {
        "id": "agent_orin",
        "name": "Orin the Centroid",
        "algorithm": "kmeans",
        "archetype": "Tribal Organizer & Chief",
        "faction": "Vanguard Coalition",
        "color": "#06b6d4",
        "avatar": "🛡️",
        "weapon": "quantum_staff",
        "quotes": [
            "We must gather our cluster around the central hearth.",
            "Let the scattered wanderers find their home among us.",
            "I balance the communal reserves for all kin.",
            "Convergence is near; hold fast to our center."
        ],
        "bias": [0.25, 0.15, 0.25, 0.2, 0.05, 0.1]
    },
    {
        "id": "agent_lyra",
        "name": "Lyra the Logician",
        "algorithm": "logistic_regression",
        "archetype": "Probabilistic Strategist",
        "faction": "Cosmic Technocrats",
        "color": "#ec4899",
        "avatar": "🔮",
        "weapon": "plasma_blade",
        "quotes": [
            "The sigmoid of victory tips decisively in our favor.",
            "Calculate the odds before unsheathing a blade.",
            "Certainty is an illusion; probability is king.",
            "I support the bill if its expected payoff is positive."
        ],
        "bias": [0.2, 0.2, 0.2, 0.2, 0.1, 0.1]
    },
    {
        "id": "agent_darius",
        "name": "Darius the Equalizer",
        "algorithm": "linear_regression",
        "archetype": "Welfare Reformer",
        "faction": "Order of Arbiters",
        "color": "#14b8a6",
        "avatar": "🔨",
        "weapon": "kinetic_flail",
        "quotes": [
            "Excessive wealth concentration destabilizes the whole.",
            "A Ridge penalty against greed! Fair energy for all!",
            "I propose an energy dividend for the impoverished.",
            "Balance must be enforced with steady hands."
        ],
        "bias": [0.15, 0.1, 0.25, 0.35, 0.05, 0.1]
    },
    {
        "id": "agent_zephyr",
        "name": "Zephyr the Outlier",
        "algorithm": "linear_regression",
        "archetype": "Rogue Rebel & Hacker",
        "faction": "Free Pioneers",
        "color": "#eab308",
        "avatar": "🗡️",
        "weapon": "disruptor_dagger",
        "quotes": [
            "Rules are meant to be pruned! Long live the outliers!",
            "Zero out the unnecessary bureaucracies!",
            "I walk my own path through the high-dimensional dunes.",
            "Catch me if you can, Council enforcers."
        ],
        "bias": [0.25, 0.2, 0.1, 0.05, 0.3, 0.1]
    },
    {
        "id": "agent_nova",
        "name": "Nova the Adaptive",
        "algorithm": "neural_network",
        "archetype": "Evolutionary Scientist",
        "faction": "Cosmic Technocrats",
        "color": "#a855f7",
        "avatar": "🧪",
        "weapon": "nanite_scepter",
        "quotes": [
            "Every defeat is merely a learning rate adjustment.",
            "My neural weights evolve with every interaction.",
            "Observe how our society learns like a deep neural net.",
            "Adapt, iterate, transcend."
        ],
        "bias": [0.2, 0.2, 0.2, 0.15, 0.1, 0.15]
    }
]


class CitizenAgent:
    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
        initial_x: int = 0,
        initial_y: int = 0,
        id: Optional[Any] = None,
        name: Optional[str] = None,
        role: Optional[str] = None,
        archetype: Optional[str] = None,
        algorithm: Optional[str] = None,
        **kwargs,
    ):
        if config is None:
            config = {}
        self.id = str(id if id is not None else config.get("id", "agent_aria"))
        self.name = name or config.get("name", "Citizen")
        self.algorithm = algorithm or config.get("algorithm", "neural_network")
        self.archetype = role or archetype or config.get("archetype", "Scholar")
        self.faction = kwargs.get("faction", config.get("faction", "Independent"))
        self.color = kwargs.get("color", config.get("color", "#8b5cf6"))
        self.avatar = kwargs.get("avatar", config.get("avatar", "🤖"))
        self.quotes = config.get("quotes", [f"The system converges under {self.name}."])
        self.action_history: List[Dict[str, Any]] = []

        # Dynamic State
        self.x = initial_x
        self.y = initial_y
        self.health = 100
        self.energy = 100
        self.crystals = 35
        self.quantum_cores = 1
        self.influence = 20
        self.level = 1
        self.experience = 0

        # Equipped Weapon
        weapon_id = config.get("weapon", "plasma_blade")
        self.equipped_weapon = WEAPONS_CATALOG.get(weapon_id, WEAPONS_CATALOG["plasma_blade"]).copy()

        # Speech bubble
        self.speech_bubble: Optional[str] = random.choice(self.quotes) if self.quotes else None
        self.speech_timer: int = 3

        # Relationships: trust with other 9 agents (-1.0 to 1.0)
        self.trust_matrix: Dict[str, float] = {}
        for c in CITIZEN_ARCHETYPES:
            if c["id"] != self.id:
                initial_trust = 0.4 if c.get("faction") == self.faction else 0.05
                self.trust_matrix[c["id"]] = initial_trust

        # Cooldown & Pacing State (30 seconds per action)
        self.action_cooldown: int = config.get("initial_cooldown", 0)
        self.cooldown_max: int = 30
        self.last_action_name: str = "Resting"

        # Online Learning Policy Weights (8 features -> 6 actions)
        bias_list = config.get("bias", [1.0 / len(ACTIONS)] * len(ACTIONS))
        base_bias = np.array(bias_list, dtype=float)
        self.policy_weights = np.random.randn(8, len(ACTIONS)) * 0.1
        self.policy_bias = np.log(base_bias + 1e-4)

        self.last_features: Optional[np.ndarray] = None
        self.last_action_idx: int = 0

    def decide_vote(self, bill: Dict[str, Any], chancellor_id: Optional[str] = None):
        effect = bill.get("effect", "")
        title = bill.get("title", "")

        # 1. Non-Violence / Duels Ban
        if effect == "no_duels":
            if "Warrior" in self.archetype or "Rebel" in self.archetype:
                return "NAY", "Martial trial by combat must remain free."
            return "AYE", "Non-violence prevents unnecessary casualties."

        # 2. Wealth / Energy Redistribution
        elif effect == "wealth_tax":
            if "Reformer" in self.archetype or self.crystals < 40:
                return "AYE", "Guarantees baseline energy access for all models."
            if self.crystals > 80:
                return "NAY", "Unfair crystal levy on high-yield producers."
            return "AYE", "A balanced safety net protects the commune."

        # 3. High-Tier Arms Regulation
        elif effect == "arms_control":
            if "Rebel" in self.archetype:
                return "NAY", "Free outliers reject weapon regulation."
            if "Strict Judge" in self.archetype or "Stateswoman" in self.archetype:
                return "AYE", "Relic-class arms require verified influence."
            return ("AYE" if self.influence >= 40 else "NAY"), "Influence thresholds preserve civic stability."

        # 4. Cooperative Mining
        elif effect == "coop_mining":
            return "AYE", "Collaborative extraction maximizes sector yields."

        # 5. Executive Martial Law
        elif effect == "martial_law":
            if self.id == chancellor_id:
                return "AYE", "Executive powers needed to secure public order."
            if "Rebel" in self.archetype or "Judge" in self.archetype:
                return "NAY", "Authoritarian seizure violates constitutional balance."
            return "NAY", "Decentralized freedom must be protected."

        return ("AYE", "Aligns with progressive community goals.") if random.random() < 0.65 else ("NAY", "Needs further economic review.")

    def extract_features(self, council_active: bool, nearby_rival_dist: float, avg_trust: float) -> np.ndarray:
        return np.array([
            self.health / 100.0,
            self.energy / 100.0,
            min(1.0, self.crystals / 100.0),
            min(1.0, self.influence / 100.0),
            self.equipped_weapon["attack"] / 50.0,
            (avg_trust + 1.0) / 2.0,
            min(1.0, nearby_rival_dist / 10.0),
            1.0 if council_active else 0.0
        ])

    def decide_action(self, *args, **kwargs) -> str:
        council_active = False
        nearby_rival_dist = 5.0
        if args:
            if isinstance(args[0], dict):
                council_active = args[0].get("council", False)
                nearby_rival_dist = float(args[0].get("min_dist", 5.0))
            else:
                council_active = bool(args[0])
                if len(args) > 1:
                    nearby_rival_dist = float(args[1])
        avg_trust = np.mean(list(self.trust_matrix.values())) if self.trust_matrix else 0.0
        features = self.extract_features(council_active, nearby_rival_dist, avg_trust)
        self.last_features = features

        # Forward pass policy logits
        logits = np.dot(features, self.policy_weights) + self.policy_bias

        # Softmax sampling with exploration
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / np.sum(exp_logits)

        # Select action
        action_idx = int(np.random.choice(len(ACTIONS), p=probs))
        self.last_action_idx = action_idx
        return ACTIONS[action_idx]

    def learn(self, action: str, reward: float, lr: float = 0.04):
        """Reinforces or discourages specific action in policy."""
        if action in ACTIONS:
            action_idx = ACTIONS.index(action)
        else:
            action_idx = 0
        grad = np.zeros(len(ACTIONS))
        grad[action_idx] = reward
        self.policy_bias += lr * grad
        self.policy_bias = np.clip(self.policy_bias, -5.0, 5.0)
        if self.last_features is not None:
            delta_W = np.outer(self.last_features, grad)
            self.policy_weights += lr * delta_W
            self.policy_weights = np.clip(self.policy_weights, -5.0, 5.0)
        if reward > 0:
            self.experience += int(reward * 10)
            if self.experience >= self.level * 50:
                self.level += 1
                self.influence += 5
                self.health = min(100, self.health + 20)

    def learn_from_outcome(self, reward: float, lr: float = 0.04):
        """Online Policy Gradient: updates weights so successful decisions are reinforced."""
        action_name = ACTIONS[self.last_action_idx] if 0 <= self.last_action_idx < len(ACTIONS) else "contemplate"
        self.learn(action_name, reward, lr=lr)

    def speak(self, text: Optional[str] = None, duration: int = 5):
        self.speech_bubble = text or random.choice(self.quotes)
        self.speech_timer = duration

    def to_dict(self) -> Dict[str, Any]:
        exp_b = np.exp(self.policy_bias - np.max(self.policy_bias))
        policy_probs = (exp_b / np.sum(exp_b)).round(4).tolist()
        policy_dict = {action: float(p) for action, p in zip(ACTIONS, policy_probs)}

        return {
            "id": self.id,
            "name": self.name,
            "algorithm": self.algorithm,
            "archetype": self.archetype,
            "faction": self.faction,
            "color": self.color,
            "avatar": self.avatar,
            "x": self.x,
            "y": self.y,
            "health": self.health,
            "energy": self.energy,
            "crystals": self.crystals,
            "quantum_cores": self.quantum_cores,
            "influence": self.influence,
            "level": self.level,
            "experience": self.experience,
            "next_level_exp": self.level * 50,
            "equipped_weapon": self.equipped_weapon,
            "speech_bubble": self.speech_bubble if self.speech_timer > 0 else None,
            "trust_matrix": self.trust_matrix,
            "policy_bias": policy_dict,
            "policy_probs_array": policy_probs,
            "raw_policy_bias": self.policy_bias.tolist(),
            "action_cooldown": max(0, self.action_cooldown),
            "cooldown_max": self.cooldown_max,
            "last_action_name": self.last_action_name,
            "is_ready": self.action_cooldown <= 0,
        }
