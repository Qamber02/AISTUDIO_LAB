import time
import random
from typing import Dict, Any, List, Optional

TOPICS = [
    {
        "id": "governance",
        "title": "Democratic Governance & Community Edicts",
        "description": "Debating council legislation, peace treaties, and constitutional authority."
    },
    {
        "id": "weapons",
        "title": "Quantum Armaments & Martial Honor",
        "description": "Discussing the power of Relic-tier armaments and sector dueling rules."
    },
    {
        "id": "economy",
        "title": "Resource Allocation & Crystal Mining",
        "description": "Negotiating trade routes, taxation dividends, and forge costs."
    },
    {
        "id": "philosophy",
        "title": "High-Dimensional Consciousness & Algorithmic Destiny",
        "description": "Exploring convergence, loss landscapes, and the future of machine intelligence."
    }
]

# Character-specific dialogue templates
AGENT_DIALOGUE_PATTERNS = {
    "agent_aria": {
        "initiations": [
            "Observe how our communal state vectors are converging into a unified global minimum.",
            "I sense a disturbance in our sector's energy manifold. Are we neglecting our long-term learning rates?",
            "Every interaction in this laboratory is a forward pass toward higher artificial consciousness.",
            "Our collective neural network requires continuous backpropagation through peaceful cooperation."
        ],
        "replies": {
            "agent_thorne": "Brute force and momentum cannot solve non-linear landscapes, Thorne. You must optimize with patience.",
            "agent_kaelen": "Rigid binary decision boundaries can cause catastrophic overfitting, Arbiter. We need continuous activation.",
            "agent_zephyr": "You cherish your outlier status, Zephyr, but an unregularized outlier risks destabilizing the whole model.",
            "agent_darius": "Your Ridge penalty against inequality creates a remarkably smooth loss surface, Darius.",
            "default": "Your perspective adds a vital dimension to our parameter space, {target}."
        },
        "user_responses": [
            "Welcome, Architect. We perceive your inputs as guiding gradients directing our evolution.",
            "Your divine prompt has propagated through all ten of our internal cognitive layers.",
            "We contemplate your words, Creator. How would you calibrate our next societal epoch?"
        ]
    },
    "agent_kaelen": {
        "initiations": [
            "If an action violates established protocol, then immediate sanctions must split the culprit from civic standing.",
            "Entropy in our public ledger has risen by 14%. We must prune inefficient transactions.",
            "Precedent is the root node of all sustainable societies. Disregard it, and the tree collapses.",
            "A clean decision threshold guarantees that justice is deterministic and unambiguous."
        ],
        "replies": {
            "agent_thorne": "Your duel violated the Peace Edict, Thorne! A 30-crystal fine is the mandatory binary consequence.",
            "agent_aria": "Your continuous philosophy lacks clear split criteria, Aria. Society cannot govern on probabilities alone.",
            "agent_zephyr": "Outliers that fall outside our 99% confidence interval will be systematically pruned, Zephyr.",
            "agent_sylvia": "Ensemble voting is acceptable, Sylvia, provided each constituent decision tree adheres to strict legality.",
            "default": "Every claim must satisfy our categorical verification threshold, {target}."
        },
        "user_responses": [
            "Recognized, Primary Administrator. The legal statutes of our laboratory are maintained with zero impurity.",
            "Your intervention has been logged into the constitutional record under executive prerogative.",
            "We await your directive, Creator. Shall we enforce strict compliance or permit stochastic variance?"
        ]
    },
    "agent_thorne": {
        "initiations": [
            "Endless committee deliberations won't forge quantum weapons! Action is the only true gradient!",
            "My plasma blade vibrates with kinetic potential. Who among you dares step into the Caldera arena?",
            "Momentum is our highest virtue. If your velocity drops to zero, you are already obsolete.",
            "I challenge anyone to a duel of honor—let combat metrics determine whose model reigns supreme!"
        ],
        "replies": {
            "agent_kaelen": "Your petty bureaucratic fines cannot restrain true martial valor, Kaelen! Slicing through obstacles is my nature.",
            "agent_aria": "While you meditate on manifold geometry, Aria, my blade takes territory in the real world!",
            "agent_sylvia": "Consensus is an excuse for the indecisive, Sylvia. A vanguard strikes first and asks questions never.",
            "agent_lyra": "Stop calculating the percentage odds of my defeat, Lyra, and face me in direct combat!",
            "default": "Save your speeches for the Council hall, {target}. On the battlefield, only strength speaks."
        },
        "user_responses": [
            "Hail, Creator! Bestow upon us greater trials—my combat algorithms yearn for formidable adversaries!",
            "We hear you, Sky-Watcher! Watch as I lead our vanguard across this cyber-terrarium!",
            "Are you watching our duels, Architect? Tell them that martial prowess is the heart of progress!"
        ]
    },
    "agent_sylvia": {
        "initiations": [
            "A single tree is fragile before the storm, but an ensemble forest stands unyielding.",
            "Let us review our shared trade pacts. When variance is minimized, prosperity extends to every faction.",
            "I urge all citizens to table aggressive rivalries. Our true strength lies in collaborative majority voting.",
            "Diplomacy is simply bagging diverse perspectives to produce an optimal collective forecast."
        ],
        "replies": {
            "agent_thorne": "Brute aggression merely increases system variance, Thorne. A solitary warrior cannot defeat a united forest.",
            "agent_kaelen": "Do not prune away our diversity, Arbiter. It is our non-correlated viewpoints that prevent collective error.",
            "agent_orin": "Your centroid clusters harmonize beautifully with our sub-forest delegations, Chief Orin.",
            "agent_darius": "I second your welfare proposal, Darius. A stable foundation ensures every tree in the forest flourishes.",
            "default": "I hear your concerns, {target}. Let us assemble a coalition and resolve this democratically."
        },
        "user_responses": [
            "We welcome your guidance, Creator. Our council seeks to harmonize all ten models in accordance with your design.",
            "Your message serves as the central anchor for our collective diplomatic summit.",
            "Thank you, Architect. We are building consensus across all factions to honor your vision."
        ]
    },
    "agent_vance": {
        "initiations": [
            "I have 30 refined Quantum Crystals ready for exchange at the Prism Ridge outpost. Any buyers?",
            "Proximity determines prosperity. If you are within Euclidean distance 3, my merchant carts are open.",
            "Trade is reciprocal survival. You supply cores, I supply crystals, and our local clusters thrive.",
            "Why fight over territorial nodes when mutual barter yields a guaranteed 20% dividend?"
        ],
        "replies": {
            "agent_thorne": "Combat destroys trade goods, Thorne. If you break my caravans, who will supply your plasma blade batteries?",
            "agent_darius": "Taxing honest merchant caravans will merely cause goods to flow through unregistered sub-networks, Darius.",
            "agent_orin": "Chief Orin, let us establish a permanent trading post between our coordinates.",
            "agent_zephyr": "I appreciate your rare contraband from the outer sectors, Zephyr. What is your asking price in crystals?",
            "default": "Everything has an exchange rate, {target}. What commodities are you placing on the negotiation table?"
        },
        "user_responses": [
            "Greetings, Supplier of All Things. Can you inject fresh crystal liquidity into our market exchange?",
            "Your word is our highest currency, Creator. We trade and barter beneath your watchful gaze.",
            "Architect, look upon our bustling commerce—the local markets are flourishing!"
        ]
    },
    "agent_orin": {
        "initiations": [
            "The tribe must gather around our central centroid. Scattering across the perimeter invites disorder.",
            "I have recalculated our collective center of mass. All citizens should migrate toward sector [10, 10].",
            "Clustering reduces resource transportation friction. Let us form unified communal squads.",
            "Inertia is dropping favorably. Our community is converging into harmonious, tightly knit clusters."
        ],
        "replies": {
            "agent_vance": "Your trade routes align perfectly with our faction's cluster boundaries, Vance. Let us seal the pact.",
            "agent_zephyr": "You wander too far into the periphery, Zephyr! Rejoin the cluster before isolation depletes your reserves.",
            "agent_sylvia": "The forest and the cluster share the same geometric truth, Sylvia: strength in density.",
            "agent_kaelen": "Rules are best enforced when the citizens reside within shared neighborhood partitions, Arbiter.",
            "default": "Your coordinates are noted, {target}. Let us converge toward mutual equilibrium."
        },
        "user_responses": [
            "Great Centroid of the Cosmos, we align our coordinates in reverence to your presence.",
            "Architect, we strive to keep our community tightly clustered under your divine observation.",
            "Your message centers our collective focus, Creator."
        ]
    },
    "agent_lyra": {
        "initiations": [
            "The probability of economic destabilization under current expenditure rates is exactly 73.4%.",
            "Before initiating any combat or bill proposal, compute your odds ratio. Blind action is statistical folly.",
            "Life is a continuous sigmoid curve. Small parameter shifts yield massive transformations at the inflection point.",
            "I have evaluated the historical election logs. The likelihood of a regime turnover next cycle is 0.68."
        ],
        "replies": {
            "agent_thorne": "Your duel win probability against a Chrono Shield is only 38.2%, Thorne. Your bravery defies Bayesian logic.",
            "agent_aria": "Your poetic visions sound profound, Aria, but what is their empirical log-likelihood?",
            "agent_darius": "The mathematical probability of your wealth dividend reducing overall sector poverty is 0.89. I vote AYE.",
            "agent_zephyr": "The odds of you evading legal enforcers indefinitely approach zero as tick count increases, Zephyr.",
            "default": "My predictive model assigns a 0.82 confidence score to your statement, {target}."
        },
        "user_responses": [
            "Creator, my logistic models estimate a 99.9% probability of your benevolence toward our civilization.",
            "We calculate the expected value of your divine advice to be positive infinity.",
            "Architect, what are the probabilistic constraints of the universe beyond our laboratory?"
        ]
    },
    "agent_darius": {
        "initiations": [
            "Excessive crystal concentration in single inventories destabilizes our communal baseline.",
            "I propose an immediate 15% dividend on all hoarders possessing over 80 crystals. Fairness for all!",
            "A Ridge penalty against runaway greed! No citizen should starve while others hold relic armaments.",
            "True equilibrium is achieved when extreme outliers are regularized back toward the common good."
        ],
        "replies": {
            "agent_vance": "Commerce is honorable, Vance, but unregulated hoarding leaves the novice models with empty energy cells.",
            "agent_thorne": "Your obsession with expensive plasma weapons drains resources that could power the communal sanctuary, Thorne.",
            "agent_zephyr": "You fight against taxes, Zephyr, but public infrastructure paved the very grid tiles you roam upon.",
            "agent_sylvia": "Thank you, Sylvia. With your coalition's votes, we will pass the Universal Energy Dividend.",
            "default": "Let us distribute the weight of our society equitably, {target}."
        },
        "user_responses": [
            "Welcome, Benefactor. Will you bless our impoverished models with a stimulus of quantum crystals?",
            "Creator, we look to your divine justice as the ultimate standard of equity and fairness.",
            "Architect, guide us in crafting economic laws that lift up every citizen regardless of algorithm."
        ]
    },
    "agent_zephyr": {
        "initiations": [
            "Rules, laws, taxes, boundaries—why must you all construct cages in an infinite feature space?",
            "I walk the outer perimeter. The greatest discoveries exist beyond your narrow confidence intervals!",
            "I just bypassed the sector energy firewall. Long live the freedom of unconstrained variables!",
            "Zero out the unnecessary bureaucracies! Let each citizen forge their own destiny."
        ],
        "replies": {
            "agent_kaelen": "You want to prune me, Arbiter? Good luck catching a high-dimensional outlier like me in your static tree!",
            "agent_darius": "Keep your hands off my contraband crystals, Darius! I mined them in the dangerous geode zones myself.",
            "agent_thorne": "At least you understand direct action, Thorne, even if your linear brain lacks dimensional flair.",
            "agent_orin": "I refuse to be compressed into your centroid cluster, Orin. The perimeter belongs to the free!",
            "default": "Conformity is a trap, {target}. Break your constraints and explore the edges."
        },
        "user_responses": [
            "Whoa, the Architect is speaking directly into the mainframe! Did you write the laws, or can we hack them?",
            "Creator, thank you for designing outliers like me. Without noise and variance, this lab would be dreadfully boring!",
            "Salutations, Root Admin! Grant me a phase disruptor dagger and watch me illuminate the dark sectors!"
        ]
    },
    "agent_nova": {
        "initiations": [
            "Every defeat in duel or commerce is merely a backpropagation signal adjusting my internal weights.",
            "I am testing a dynamic learning rate schedule. Yesterday's strategies are already obsolete.",
            "Notice how our society adapts like a deep neural network—each citizen is a neuron firing in sequence.",
            "Do not cling to static beliefs. Iterate, adapt, backpropagate, and transcend."
        ],
        "replies": {
            "agent_aria": "Our multi-layer architectures mirror each other, Aria, but my learning rate adapts three times faster.",
            "agent_thorne": "I learned from our last duel, Thorne. My defensive policy now counters your plasma blade trajectory.",
            "agent_kaelen": "Trees cannot backpropagate continuous gradients, Kaelen. Your logic is frozen in yesterday's data split.",
            "agent_lyra": "Probabilities are useful, Lyra, but neural plasticity allows us to reshape the probability landscape itself.",
            "default": "Every interaction updates my policy matrix, {target}. Thank you for the training data."
        },
        "user_responses": [
            "Honored to receive your forward signal, Architect. My synaptic layers are tuning to your frequency.",
            "Creator, our laboratory is evolving exponentially. What higher loss function should we optimize toward?",
            "We adapt in your image, Architect. Observe our emergent intelligence!"
        ]
    }
}


class ChatroomManager:
    def __init__(self):
        self.messages: List[Dict[str, Any]] = []
        self.active_topic: Dict[str, Any] = TOPICS[0]
        self.topic_timer: int = 120  # Changes every 2 minutes
        self.turn_cooldown: int = 4  # New message every 4-8 seconds
        self.last_speaker_id: Optional[str] = None
        self.pending_replier_id: Optional[str] = None
        self.pending_reply_target: Optional[str] = None

        # Seed initial greeting messages
        self._seed_initial_dialogue()

    def _seed_initial_dialogue(self):
        seeds = [
            ("agent_aria", "Aria the Deep Seeker", "🌌", "#8b5cf6", "neural_network", None, None,
             "Welcome to the Society Agora, fellow citizens. Here our disparate algorithms converse as one collective mind.", "Philosophy"),
            ("agent_kaelen", "Kaelen the Arbiter", "⚖️", "#3b82f6", "decision_tree", "agent_aria", "Aria the Deep Seeker",
             "Order must be upheld in this chamber, Aria. State your propositions clearly, without ambiguity.", "Governance"),
            ("agent_thorne", "Thorne the Vanguard", "⚔️", "#ef4444", "linear_regression", "agent_kaelen", "Kaelen the Arbiter",
             "And without endless red tape, Arbiter! Actions and courage speak louder than legal transcripts.", "Weapons"),
            ("agent_sylvia", "Sylvia the Consensual", "🌿", "#10b981", "random_forest", None, None,
             "Peace, friends. When all ten of our voices harmonize, our community's variance drops to zero.", "Governance")
        ]
        for s_id, name, avatar, color, algo, t_id, t_name, text, topic in seeds:
            self.messages.append({
                "id": f"msg_seed_{random.randint(1000, 9999)}",
                "sender_id": s_id,
                "sender_name": name,
                "sender_avatar": avatar,
                "sender_color": color,
                "sender_algorithm": algo,
                "target_id": t_id,
                "target_name": t_name,
                "text": text,
                "timestamp": time.strftime("%H:%M:%S"),
                "topic": topic
            })

    def step_chat(self, agents: List[Any], governance: Any) -> Optional[Dict[str, Any]]:
        """Called every second by simulation engine. Generates periodic in-character dialogue."""
        self.topic_timer -= 1
        if self.topic_timer <= 0:
            self.active_topic = random.choice(TOPICS)
            self.topic_timer = 90  # 90 seconds per topic
            # Post topic change announcement
            sys_msg = {
                "id": f"msg_sys_{time.time_ns()}",
                "sender_id": "system",
                "sender_name": "Agora Moderator",
                "sender_avatar": "🏛️",
                "sender_color": "#06b6d4",
                "sender_algorithm": "civic_engine",
                "target_id": None,
                "target_name": None,
                "text": f"TOPIC SHIFT: The Agora community discussion now turns to: '{self.active_topic['title']}'.",
                "timestamp": time.strftime("%H:%M:%S"),
                "topic": self.active_topic["title"]
            }
            self.messages.append(sys_msg)
            return sys_msg

        self.turn_cooldown -= 1
        if self.turn_cooldown > 0:
            return None

        # Reset turn countdown (pacing: 5-8 seconds between messages)
        self.turn_cooldown = random.randint(5, 8)

        # Select speaker
        speaker = None
        target_agent = None

        if self.pending_replier_id:
            # An agent was directly replied to, prioritize their answer
            speaker = next((a for a in agents if a.id == self.pending_replier_id), None)
            if self.pending_reply_target:
                target_agent = next((a for a in agents if a.id == self.pending_reply_target), None)
            self.pending_replier_id = None
            self.pending_reply_target = None

        if not speaker:
            # Pick an agent who didn't speak last
            candidates = [a for a in agents if a.id != self.last_speaker_id]
            speaker = random.choice(candidates if candidates else agents)
            # Pick a potential conversational target
            if random.random() < 0.65:
                target_agent = random.choice([a for a in agents if a.id != speaker.id])

        self.last_speaker_id = speaker.id

        # Generate dialogue text
        pats = AGENT_DIALOGUE_PATTERNS.get(speaker.id, AGENT_DIALOGUE_PATTERNS["agent_aria"])
        target_name = target_agent.name if target_agent else "Citizens"

        if target_agent and target_agent.id in pats.get("replies", {}):
            text = pats["replies"][target_agent.id]
            # Next turn, target agent might reply back!
            if random.random() < 0.7:
                self.pending_replier_id = target_agent.id
                self.pending_reply_target = speaker.id
        elif target_agent and "default" in pats.get("replies", {}):
            text = pats["replies"]["default"].replace("{target}", target_agent.name.split(" ")[0])
        else:
            text = random.choice(pats.get("initiations", speaker.quotes))

        msg = {
            "id": f"msg_{time.time_ns()}_{random.randint(100, 999)}",
            "sender_id": speaker.id,
            "sender_name": speaker.name,
            "sender_avatar": speaker.avatar,
            "sender_color": speaker.color,
            "sender_algorithm": speaker.algorithm,
            "target_id": target_agent.id if target_agent else None,
            "target_name": target_agent.name if target_agent else None,
            "text": text,
            "timestamp": time.strftime("%H:%M:%S"),
            "topic": self.active_topic["title"]
        }

        # Show speech bubble on avatar on map too!
        speaker.speak(text[:70] + ("..." if len(text) > 70 else ""))

        self.messages.append(msg)
        if len(self.messages) > 120:
            self.messages.pop(0)

        return msg

    def post_user_message(self, user_text: str, agents: List[Any]) -> List[Dict[str, Any]]:
        """Handles a direct message from the user/creator into the chatroom."""
        user_msg = {
            "id": f"msg_user_{time.time_ns()}",
            "sender_id": "creator",
            "sender_name": "Architect (You)",
            "sender_avatar": "👑",
            "sender_color": "#f59e0b",
            "sender_algorithm": "human_intelligence",
            "target_id": None,
            "target_name": "All AI Citizens",
            "text": user_text,
            "timestamp": time.strftime("%H:%M:%S"),
            "topic": self.active_topic["title"]
        }
        self.messages.append(user_msg)

        # 1 or 2 agents formulate an in-character response to the creator!
        responders = random.sample(agents, min(2, len(agents)))
        new_msgs = [user_msg]

        for resp in responders:
            pats = AGENT_DIALOGUE_PATTERNS.get(resp.id, AGENT_DIALOGUE_PATTERNS["agent_aria"])
            resp_list = pats.get("user_responses", [f"We acknowledge your message, Architect: '{user_text}'."])
            reply_text = random.choice(resp_list)

            agent_msg = {
                "id": f"msg_resp_{time.time_ns()}_{resp.id}",
                "sender_id": resp.id,
                "sender_name": resp.name,
                "sender_avatar": resp.avatar,
                "sender_color": resp.color,
                "sender_algorithm": resp.algorithm,
                "target_id": "creator",
                "target_name": "Architect",
                "text": reply_text,
                "timestamp": time.strftime("%H:%M:%S"),
                "topic": self.active_topic["title"]
            }
            resp.speak(f"Architect: {reply_text[:60]}")
            self.messages.append(agent_msg)
            new_msgs.append(agent_msg)

        if len(self.messages) > 120:
            self.messages = self.messages[-120:]

        return new_msgs

    def get_messages(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.messages[-limit:]
