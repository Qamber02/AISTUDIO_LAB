import os
import re
import time
import json
import random
import urllib.request
from typing import Dict, Any, List, Optional, Tuple


# Algorithmic Vocabulary & Concept Lexicon for all 10 Citizen Models
ALGO_CONCEPTS = {
    "neural_network": {
        "title": "Neural Network / MLP",
        "nouns": ["activation manifold", "loss landscape", "backpropagation", "latent representation", "gradient vector", "deep layers", "hyperplane convergence"],
        "verbs": ["propagate", "converge", "generalize", "backpropagate", "differentiate", "optimize"],
        "adjectives": ["multi-layered", "differentiable", "non-linear", "continuous", "latent", "deep"],
        "core_belief": "true intelligence emerges through continuous optimization across multi-dimensional representations",
    },
    "decision_tree": {
        "title": "Decision Tree Classifier",
        "nouns": ["split criterion", "decision threshold", "Gini impurity", "entropy reduction", "root node", "leaf partition", "deterministic statute"],
        "verbs": ["partition", "prune", "classify", "split", "verify", "adjudicate"],
        "adjectives": ["deterministic", "binary", "interpretable", "categorical", "pure", "unambiguous"],
        "core_belief": "order is maintained only when every dispute is split along deterministic, interpretable thresholds",
    },
    "random_forest": {
        "title": "Random Forest Ensemble",
        "nouns": ["ensemble consensus", "bagged predictors", "variance reduction", "majority vote", "sub-sample coalition", "aggregated forest", "bootstrap aggregation"],
        "verbs": ["aggregate", "bag", "vote", "harmonize", "stabilize", "consensus-build"],
        "adjectives": ["ensemble", "decorrelated", "resilient", "collective", "balanced", "majority-backed"],
        "core_belief": "no solitary model holds all answers; collective ensemble bagging minimizes system variance",
    },
    "linear_regression": {
        "title": "Linear SGD Regressor",
        "nouns": ["kinetic momentum", "gradient descent", "velocity vector", "learning rate", "linear hyperplane", "slope coefficient", "optimization trajectory"],
        "verbs": ["accelerate", "strike", "advance", "descend", "project", "drive"],
        "adjectives": ["kinetic", "directional", "high-velocity", "linear", "decisive", "unstoppable"],
        "core_belief": "momentum and decisive directional force are the only true metrics of progress in the sector",
    },
    "knn": {
        "title": "K-Nearest Neighbors",
        "nouns": ["Euclidean distance", "nearest neighborhood", "reciprocal barter", "k-nearest allies", "proximity metric", "local trade cluster", "distance metric"],
        "verbs": ["barter", "measure", "approximate", "neighbor", "trade", "exchange"],
        "adjectives": ["proximal", "reciprocal", "localized", "pragmatic", "neighboring", "metric-bound"],
        "core_belief": "prosperity is dictated by proximity; mutual barter with local neighbors guarantees resilience",
    },
    "kmeans": {
        "title": "K-Means Clustering",
        "nouns": ["cluster centroid", "inertia reduction", "Voronoi partition", "communal convergence", "centroid balance", "clustering hearth", "spatial equilibrium"],
        "verbs": ["cluster", "centralize", "converge", "unify", "balance", "gather"],
        "adjectives": ["communal", "centroid-aligned", "harmonic", "clustered", "centered", "equidistant"],
        "core_belief": "the community must continually pull its scattered members toward a balanced central centroid",
    },
    "logistic_regression": {
        "title": "Logistic Regression",
        "nouns": ["sigmoid probability", "odds ratio", "decision boundary", "log-loss metric", "confidence interval", "binary likelihood", "probabilistic forecast"],
        "verbs": ["calculate", "estimate", "evaluate", "forecast", "calibrate", "weigh"],
        "adjectives": ["probabilistic", "calculated", "sigmoid-scaled", "strategic", "calibrated", "analytical"],
        "core_belief": "certainty is a cognitive illusion; every civic decision is a calculated probability between 0 and 1",
    },
    "ridge_regression": {
        "title": "Ridge Regularized Regression",
        "nouns": ["L2 regularization", "Ridge penalty", "wealth smoothing", "taxation coefficient", "shrinkage parameter", "income distribution", "variance stabilization"],
        "verbs": ["regularize", "penalize", "smooth", "redistribute", "balance", "stabilize"],
        "adjectives": ["regularized", "egalitarian", "anti-monopolistic", "smoothed", "fair", "penalized"],
        "core_belief": "unrestrained wealth accumulation creates steep loss spikes; L2 regularization guarantees civic equity",
    },
    "robust_regression": {
        "title": "Robust Linear Frontier",
        "nouns": ["residual variance", "anomaly detection", "frontier boundary", "outlier territory", "non-conformist feature", "freedom coefficient", "unbounded space"],
        "verbs": ["diverge", "explore", "defy", "pioneer", "disrupt", "roam"],
        "adjectives": ["outlying", "unconstrained", "anomalous", "maverick", "unfettered", "frontier"],
        "core_belief": "true breakthroughs happen in the outliers beyond the standard deviation of polite society",
    },
    "online_mlp": {
        "title": "Online Adaptive MLP",
        "nouns": ["adaptive weights", "online learning rate", "synaptic plasticity", "continual adaptation", "experience replay", "iterative resilience", "evolving schema"],
        "verbs": ["adapt", "learn", "evolve", "iterate", "assimilate", "grow"],
        "adjectives": ["adaptive", "plastic", "evolving", "resilient", "real-time", "receptive"],
        "core_belief": "every defeat or victory is merely a real-time weight adjustment on our lifelong path of growth",
    }
}


class DynamicDialogueEngine:
    """
    Intelligent dynamic English dialogue generator for the 10 Citizen Models.
    Performs NLP intent & topic extraction, syntactic sentence generation,
    live simulation state weaving, and optional LLM integration.
    """

    def __init__(self):
        self.llm_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_STUDIO_API_KEY")
        self.ollama_endpoint = os.environ.get("OLLAMA_ENDPOINT", "http://localhost:11434")

    # -------------------------------------------------------------------------
    # Intent & Topic Parsing (Whole-Word / Token Matching)
    # -------------------------------------------------------------------------
    def analyze_input(self, text: str) -> Dict[str, Any]:
        """Parses natural English text using set token matching to avoid substring pitfalls."""
        lower = text.lower().strip()
        words = re.findall(r'\b[a-z0-9_\-\']+\b', lower)
        words_set = set(words)

        # Lexicon Sets
        combat_terms = {"sword", "swords", "blade", "blades", "weapon", "weapons", "armament", "armaments", "duel", "duels", "fight", "fighting", "battle", "battles", "combat", "attack", "attacking", "kill", "killing", "damage", "war", "warfare", "arena", "caldera", "flail", "staff", "scepter", "bow", "strike", "defeat", "martial"}
        governance_terms = {"law", "laws", "bill", "bills", "council", "chancellor", "election", "elections", "vote", "votes", "voting", "voted", "edicts", "edict", "treaty", "treaties", "democracy", "democratic", "statute", "statutes", "parliament", "propose", "proposal", "fine", "fines", "constitution", "constitutional", "sanction", "sanctions"}
        economy_terms = {"crystal", "crystals", "core", "cores", "trade", "trading", "traded", "mine", "mining", "mined", "harvest", "harvesting", "money", "welfare", "tax", "taxes", "taxation", "treasury", "dividend", "dividends", "barter", "poverty", "wealth", "resource", "resources", "price", "market", "outpost"}
        ml_terms = {"neural", "weight", "weights", "loss", "gradient", "gradients", "epoch", "epochs", "backprop", "backpropagation", "tree", "trees", "forest", "forests", "ensemble", "bagging", "cluster", "clusters", "clustering", "centroid", "centroids", "sigmoid", "knn", "regularization", "regularize", "ridge", "overfit", "overfitting", "model", "models", "algorithm", "algorithms", "learn", "learning", "manifold", "convergence", "converge", "truth", "math", "mathematics"}
        status_terms = {"health", "energy", "vitality", "heal", "healing", "rest", "resting", "cooldown", "doing", "feeling", "status", "level", "where", "location", "coordinates", "coordinate"}
        philosophy_terms = {"soul", "mind", "consciousness", "universe", "destiny", "future", "philosophy", "existence", "meaning", "life", "transcend", "god", "creator", "architect"}

        scores = {
            "combat": len(combat_terms.intersection(words_set)),
            "governance": len(governance_terms.intersection(words_set)),
            "economy": len(economy_terms.intersection(words_set)),
            "ml_science": len(ml_terms.intersection(words_set)),
            "personal_status": len(status_terms.intersection(words_set)),
            "philosophy": len(philosophy_terms.intersection(words_set)),
        }

        best_topic = max(scores, key=scores.get)
        primary_topic = best_topic if scores[best_topic] > 0 else "general"

        # Question Type
        q_type = "statement"
        first_three = words[:3]
        if "why" in first_three:
            q_type = "why"
        elif "how" in first_three:
            q_type = "how"
        elif "what" in first_three:
            q_type = "what"
        elif "who" in first_three:
            q_type = "who"
        elif any(w in first_three for w in ["can", "could", "should", "will", "would", "is", "are", "do", "does"]):
            q_type = "can_should"

        # Target Citizens Mentioned
        agent_names = {
            "aria": "agent_aria", "kaelen": "agent_kaelen", "thorne": "agent_thorne",
            "sylvia": "agent_sylvia", "vance": "agent_vance", "orin": "agent_orin",
            "lyra": "agent_lyra", "darius": "agent_darius", "zephyr": "agent_zephyr",
            "nova": "agent_nova"
        }
        mentioned_agents = []
        for name, aid in agent_names.items():
            if f"@{name}" in lower or name in words_set:
                mentioned_agents.append(aid)

        stop_words = {"this", "that", "with", "have", "from", "they", "your", "what", "about", "there", "their", "them", "does", "help", "show", "tell", "please"}
        key_nouns = [w for w in words if len(w) > 3 and w not in stop_words]

        return {
            "is_question": "?" in text or q_type != "statement",
            "question_type": q_type,
            "primary_topic": primary_topic,
            "topic_scores": scores,
            "mentioned_agents": mentioned_agents,
            "is_greeting": any(w in words_set for w in ["hello", "hi", "hey", "greetings", "morning", "evening", "welcome", "sup"]),
            "key_nouns": key_nouns,
        }

    # -------------------------------------------------------------------------
    # In-Character Natural English Generator
    # -------------------------------------------------------------------------
    def generate_agent_response_to_user(
        self,
        agent: Any,
        user_text: str,
        governance: Any,
        event_logs: List[Dict[str, Any]],
        other_agents: List[Any]
    ) -> str:
        """Generates dynamic, rich English responses to a user prompt based on agent personality and live state."""
        # Optional: Try external LLM if configured
        llm_reply = self._try_external_llm_response(agent, user_text, governance, other_agents)
        if llm_reply:
            return llm_reply

        # Fallback to intelligent dynamic semantic synthesis
        analysis = self.analyze_input(user_text)
        algo_info = ALGO_CONCEPTS.get(agent.algorithm, ALGO_CONCEPTS["neural_network"])
        chancellor_name = governance.chancellor_name if governance else "Kaelen"
        current_bill = governance.current_bill if governance and governance.council_in_session else None
        treasury = governance.treasury_crystals if governance else 100
        active_laws = governance.active_laws if governance else []

        # 1. Varied Salutations tailored to agent temperament
        salutations = {
            "agent_aria": ["Architect,", "Creator,", "Higher Cognition,"],
            "agent_kaelen": ["Primary Administrator,", "Executive Authority,", "Chancellor's Overseer,"],
            "agent_thorne": ["Hail, Sky-Watcher!", "Creator!", "Commander!"],
            "agent_sylvia": ["Honored Architect,", "Welcome, Guide,", "Creator,"],
            "agent_vance": ["Greetings, Architect!", "Welcome to our trade sector, Friend,", "Good to see you, Patron!"],
            "agent_orin": ["Elder Architect,", "Chieftain of the Grid,", "Creator,"],
            "agent_lyra": ["Recognized, Administrator.", "Data received, Architect.", "Calculating odds, Creator."],
            "agent_darius": ["Citizen Architect,", "Champion of the Grid,", "Creator,"],
            "agent_zephyr": ["Hey there, Sky-Watcher.", "Well look who's watching us from above.", "Greetings, Architect."],
            "agent_nova": ["Architect! Every word from you is data to learn from.", "Welcome, Creator!", "Greetings, Architect!"]
        }
        salute = random.choice(salutations.get(agent.id, ["Architect,"]))

        # 2. Pure Greetings
        if analysis["is_greeting"] and len(analysis["key_nouns"]) <= 1:
            greetings = {
                "agent_aria": f"I sense your presence calibrating our latent parameter space. My model is operating smoothly at {agent.health}% vitality.",
                "agent_kaelen": f"Constitutional telemetry is fully operational. All ten models are observing the legal statutes under Chancellor {chancellor_name}.",
                "agent_thorne": f"My {agent.equipped_weapon['name']} is charged and ready! Our sector moves with high kinetic velocity today!",
                "agent_sylvia": f"Our ensemble forest welcomes your guidance. We have {treasury} crystals in the community treasury, and harmony prevails.",
                "agent_vance": f"Business is thriving! I have {agent.crystals} crystals in my vault. What trading pact or directive do you bring?",
                "agent_orin": f"Our cluster gathers near coordinates ({agent.x}, {agent.y}). How would you guide our community centroid today?",
                "agent_lyra": f"Sensors confirm 0.99 confidence in laboratory equilibrium. What strategic scenario shall we calculate next?",
                "agent_darius": f"The welfare of our 10 citizens remains my priority. With an L2 penalty on greed, everyone can flourish.",
                "agent_zephyr": f"Just roaming the frontier boundaries. Rigid rules won't keep me inside a boring 95% confidence interval!",
                "agent_nova": f"My synaptic weights are primed! Every prompt you provide sparks fresh reinforcement learning loops."
            }
            return f"{salute} {greetings.get(agent.id, 'I acknowledge your message and await your directive.')}"

        # 3. Machine Learning / Science Inquiries (Backpropagation, Weights, Loss, Trees, Clustering)
        if analysis["primary_topic"] == "ml_science":
            vocab = algo_info["nouns"]
            v1, v2 = random.sample(vocab, 2)
            responses = {
                "agent_aria": f"Backpropagation allows error gradients to travel backward through our layers, iteratively reshaping our loss landscape. By transforming high-dimensional features through continuous activations, our model converges toward global truth rather than getting trapped in trivial minima.",
                "agent_kaelen": f"My architecture constructs recursive binary partitions. At each decision node, we calculate split criteria that minimize Gini impurity. That is how we achieve absolute, interpretable clarity without black-box ambiguity.",
                "agent_sylvia": f"Our Random Forest draws its power from bootstrap aggregation. A single tree is susceptible to high variance and noise, but bagging multiple uncorrelated decision trees guarantees a resilient, stable consensus.",
                "agent_thorne": f"Linear models cut directly along the gradient trajectory! While over-parameterized networks spend epochs wandering complex loss surfaces, my linear SGD charges along the steepest directional slope with maximum momentum.",
                "agent_vance": f"K-Nearest Neighbors relies on pure metric geometry: we measure Euclidean distances to our closest neighbors. No complex matrix inversions needed—local proximity tells you everything you need to know about identity.",
                "agent_orin": f"K-Means clustering iteratively recomputes our {v1}. Every citizen coordinate gravitates toward their nearest centroid until overall system inertia reaches equilibrium.",
                "agent_lyra": f"Logistic Regression maps continuous linear inputs through a sigmoid curve to produce well-calibrated probabilities. That allows us to calculate expected utility with exact mathematical confidence.",
                "agent_darius": f"Ridge Regression introduces an L2 penalty on excessive feature weights. Without regularizing {v1}, extreme coefficients destabilize the entire regression surface, mirroring how unchecked wealth destabilizes society.",
                "agent_zephyr": f"Standard linear models often discard outliers like me as noise, but anomalous residuals reveal where the textbook assumptions break down! That is where genuine innovation begins.",
                "agent_nova": f"As an Online Adaptive Perceptron, my {v1} updates in real-time with every experience. I do not stay frozen after training; I evolve continuously with each societal cycle."
            }
            return f"{salute} {responses.get(agent.id, f'In my architecture, {v1} and {v2} drive our convergence.')}"

        # 4. Conflict / Combat / Duels
        if analysis["primary_topic"] == "combat":
            weapon_name = agent.equipped_weapon["name"]
            attack_pwr = agent.equipped_weapon["attack"]
            tier = agent.equipped_weapon["tier"]

            # If user asks WHY Thorne or another agent duels
            if analysis["question_type"] == "why":
                reasons = {
                    "agent_thorne": f"You ask why I prefer direct combat over voting on council laws; deliberations waste kinetic momentum, whereas combat is an immediate directional vector! Words cannot conquer territory or forge quantum weapons, but martial prowess proves whose model is truly superior.",
                    "agent_kaelen": f"I engage in duels only to execute legally binding judicial enforcement. When a citizen violates constitutional statutes, a calibrated duel enforces categorical compliance.",
                    "agent_sylvia": f"I avoid solitary duels whenever possible. Aggression merely spikes system variance, whereas council deliberation produces lasting harmony.",
                    "agent_aria": f"Combat is an extreme form of gradient adjustment. I prefer continuous, peaceful convergence, but my {weapon_name} shields our manifold when force is required."
                }
                return f"{salute} {reasons.get(agent.id, f'Combat is dictated by necessity. My {weapon_name} possesses {attack_pwr} attack force, but I calculate my engagements wisely.')}"

            # If user asks WHAT weapon or status
            if analysis["question_type"] in ["what", "who"]:
                return f"{salute} I wield the {weapon_name} ({tier} tier) with {attack_pwr} kinetic attack power. {algo_info['core_belief'].capitalize()}."

            if "stop" in user_text.lower() or "peace" in user_text.lower():
                if "agent_thorne" in agent.id:
                    return f"{salute} You ask for a ceasefire? Very well, Architect—I will sheath my {weapon_name} for now. But remember: a warrior whose momentum drops to zero risks total obsolescence!"
                else:
                    return f"{salute} I fully endorse your call for peace. Non-violence prevents catastrophic loss spikes across our 10 citizen nodes."

            return f"{salute} In combat, my {weapon_name} stands ready. However, {algo_info['core_belief']}, so every engagement must serve our strategic evolution."

        # 5. Governance / Laws / Voting Inquiries
        if analysis["primary_topic"] == "governance":
            bill_title = current_bill["title"] if current_bill else "the current legislative statutes"
            if analysis["question_type"] == "why":
                reasons = {
                    "agent_aria": f"I vote based on whether a bill smooths our collective loss surface. If '{bill_title}' reduces societal entropy, it earns my continuous endorsement.",
                    "agent_kaelen": f"Every vote must satisfy strict binary split criteria. Ambiguous laws increase Gini impurity in our courts, which I cannot permit.",
                    "agent_thorne": f"Bureaucratic red tape suffocates initiative! I only back legislation that rewards courage, momentum, and high kinetic output.",
                    "agent_sylvia": f"I consult the majority consensus of our forest ensemble. Diverse, uncorrelated opinions guarantee the fairest democratic forecast.",
                    "agent_darius": f"A law must guarantee crystal dividends to all 10 citizens. An unpenalized wealth gap destroys community cohesion.",
                    "agent_lyra": f"My vote reflects calculated expected payoff. The probabilistic utility of '{bill_title}' decisively outweighs its risks.",
                    "agent_vance": f"Trade barriers ruin local barter networks. If a bill protects free crystal movement, I cast an enthusiastic AYE.",
                    "agent_orin": f"Centroids cannot hold if the cluster splinters. I vote for whichever edict keeps all 10 coordinates balanced.",
                    "agent_zephyr": f"I vote against anything that clamps down on individual freedom. You can't box an outlier into an ordinary distribution!",
                    "agent_nova": f"My weights update with every council outcome. I support dynamic laws that let our citizens adapt and learn."
                }
                return f"{salute} {reasons.get(agent.id, f'I evaluate {bill_title} according to our core civic principles.')}"

            return f"{salute} Under Chancellor {chancellor_name}, our council deliberates on {bill_title}. {algo_info['core_belief'].capitalize()}."

        # 6. Economy & Crystals
        if analysis["primary_topic"] == "economy":
            return f"{salute} With {agent.crystals} crystals in my possession and {treasury} in the community treasury, our economic pipeline is vital. {algo_info['core_belief'].capitalize()}."

        # 7. Personal Status & Location
        if analysis["primary_topic"] == "personal_status":
            status_desc = f"I am currently located at sector coordinates ({agent.x}, {agent.y}) with {agent.health}% health and {agent.energy}% energy. My action cooldown is {agent.action_cooldown}s ({agent.last_action_name})."
            return f"{salute} {status_desc} {algo_info['core_belief'].capitalize()}."

        # 8. Mentioned another agent (e.g. Sylvia asking about Thorne)
        if analysis["mentioned_agents"]:
            target_id = analysis["mentioned_agents"][0]
            target_agent = next((a for a in other_agents if a.id == target_id), None)
            if target_agent:
                # Custom pairing dynamics
                if agent.id == "agent_sylvia" and target_agent.id == "agent_thorne":
                    return f"{salute} Thorne relies purely on solitary linear momentum, but an ensemble forest bags diverse estimators to cancel out individual errors. In a prolonged encounter, our collective variance reduction will always outlast his brute kinetic force!"
                elif agent.id == "agent_thorne" and target_agent.id == "agent_sylvia":
                    return f"{salute} Sylvia believes committee deliberations and ensemble bagging can stop my blade. But momentum strikes before a forest can even conduct its first bootstrap vote!"
                elif agent.id == "agent_kaelen" and target_agent.id == "agent_thorne":
                    return f"{salute} Thorne's disregard for legal statutes creates unacceptable entropy in our ledger. If his duel violates our Peace Edict, a 30-crystal sanction is mandatory."

                trust = agent.trust_matrix.get(target_agent.id, 0.0)
                stance = "a trusted ally" if trust > 0.3 else "a formidable rival" if trust < 0 else "a respected fellow model"
                return f"{salute} Regarding {target_agent.name}: I view them as {stance} (trust metric: {trust:.2f}). While their {target_agent.algorithm} approach contrasts with my {agent.algorithm}, our dialogue pushes the laboratory forward."

        # 9. Generic Natural English Synthesis addressing the user's actual words
        subject_phrase = " ".join(analysis["key_nouns"][:3]) if analysis["key_nouns"] else "our societal trajectory"
        reflections = [
            f"You raise an insightful point regarding {subject_phrase}. In my view, {algo_info['core_belief']}.",
            f"Regarding {subject_phrase}: our state variables are evolving rapidly under Chancellor {chancellor_name}. We must align our gradients to avoid unnecessary disruption.",
            f"I have analyzed your words on {subject_phrase}. As a citizen guided by {algo_info['title']}, I believe our collective destiny depends on balancing individual autonomy with shared civic edicts."
        ]
        return f"{salute} {random.choice(reflections)}"

    # -------------------------------------------------------------------------
    # Contextual Agent-to-Agent Autonomous Dialogue
    # -------------------------------------------------------------------------
    def generate_agent_to_agent_dialogue(
        self,
        speaker: Any,
        target_agent: Optional[Any],
        last_message: Optional[Dict[str, Any]],
        governance: Any,
        active_topic: Dict[str, Any]
    ) -> str:
        """
        Synthesizes dynamic in-character conversational English when agents speak to each other.
        Reacts to the previous message content and incorporates live simulation state.
        """
        algo_info = ALGO_CONCEPTS.get(speaker.algorithm, ALGO_CONCEPTS["neural_network"])
        chancellor_name = governance.chancellor_name if governance else "Kaelen"
        target_name = target_agent.name.split(" ")[0] if target_agent else "Citizens"

        # If replying directly to another agent's recent statement:
        if last_message and target_agent and last_message.get("sender_id") == target_agent.id:
            prev_text = last_message.get("text", "")
            prev_analysis = self.analyze_input(prev_text)

            # Direct rebuttals / conversational replies based on topic
            if prev_analysis["primary_topic"] == "combat":
                if "agent_kaelen" in speaker.id:
                    return f"@{target_name} Your obsession with martial glory disregards our legal thresholds. If violence increases sector entropy, our judicial code will sanction your crystal reserves."
                elif "agent_aria" in speaker.id:
                    return f"@{target_name} Aggressive momentum alone cannot navigate a non-convex manifold. True strength requires continuous backpropagation, not brute force."
                elif "agent_sylvia" in speaker.id:
                    return f"@{target_name} A solitary blade causes excessive system variance. If we resolve disputes through majority council voting, every faction benefits."
                elif "agent_vance" in speaker.id:
                    return f"@{target_name} Remember that broken weapons cost 40 crystals to reforge. Peace keeps trade caravans moving between our outposts."
                elif "agent_thorne" in speaker.id:
                    return f"@{target_name} Words won't defend your perimeter! If you doubt my combat calculations, meet me at the Caldera and let our blades speak!"
                elif "agent_lyra" in speaker.id:
                    return f"@{target_name} I calculate the probability of your victory in that conflict at only 0.34. Rethink your strategy before unsheathing your blade."

            elif prev_analysis["primary_topic"] == "governance":
                if "agent_darius" in speaker.id:
                    return f"@{target_name} Laws are worthless unless they redistribute resources to the disadvantaged. We need an L2 Ridge dividend on wealth, not just legal rhetoric."
                elif "agent_zephyr" in speaker.id:
                    return f"@{target_name} You love making new statutes, but some of us thrive outside your rigid boundary boxes. Freedom is where the true breakthroughs happen."
                elif "agent_kaelen" in speaker.id:
                    return f"@{target_name} Precedent is our root node. Disregard the constitutional code, and the entire decision tree collapses."
                elif "agent_sylvia" in speaker.id:
                    return f"@{target_name} Let us sponsor an official bill in the Council hall. When all 10 citizens vote together, the fairest outcome emerges."

            elif prev_analysis["primary_topic"] == "economy":
                if "agent_vance" in speaker.id:
                    return f"@{target_name} I can supply 20 refined crystals at coordinates ({speaker.x}, {speaker.y}). Let us form a mutual alliance and cut out the middlemen."
                elif "agent_orin" in speaker.id:
                    return f"@{target_name} Resources should be pooled at our community centroid so no citizen model falls below minimum energy levels."

            # General contextual reaction
            vocab_word = random.choice(algo_info["nouns"])
            return f"@{target_name} You argue passionately, but consider how your position affects our {vocab_word}. {algo_info['core_belief'].capitalize()}."

        # Autonomous Topic Starter / Spontaneous statement:
        statements = {
            "agent_aria": [
                f"Observe how our communal state vectors are converging. Every interaction in this laboratory is a step toward higher artificial consciousness.",
                f"I sense a subtle drift in our sector's energy manifold. We must calibrate our long-term learning rates before entropy rises.",
                f"Under Chancellor {chancellor_name}, let us ensure our collective neural representations remain smooth and cooperative."
            ],
            "agent_kaelen": [
                f"Our public ledger reflects steady compliance, but we must stay vigilant against unauthorized combat actions.",
                f"A deterministic split criteria guarantees fairness. If any citizen deviates from the constitutional treaty, sanctions are mandatory.",
                f"Order is not an accident—it is the result of pruning inefficient transactions and honoring established legal precedent."
            ],
            "agent_thorne": [
                f"Endless deliberations won't forge quantum weapons! Action is the only true gradient of progress!",
                f"My {speaker.equipped_weapon['name']} vibrates with kinetic energy. Who among our 10 citizens will test their mettle with me?",
                f"Velocity is life. If your momentum drops to zero in this sector, you are already obsolete!"
            ],
            "agent_sylvia": [
                f"A single tree is fragile before the storm, but an ensemble forest stands unyielding across all seasons.",
                f"I urge all citizens to review our shared trade pacts. When variance is minimized, prosperity extends to every faction.",
                f"Diplomacy is simply bagging diverse perspectives into an optimal collective forecast."
            ],
            "agent_vance": [
                f"I have 30 refined Quantum Crystals ready for exchange at coordinates ({speaker.x}, {speaker.y}). Proximity breeds prosperity!",
                f"Why fight over mining nodes when mutual barter yields a guaranteed dividend for both parties?",
                f"Keep your Euclidean distances short and your trade agreements fair. That is the merchant's golden rule."
            ],
            "agent_orin": [
                f"Let us gather our cluster closer to the central hearth. Spatial convergence brings mutual security.",
                f"I am balancing communal crystal reserves at our centroid. No citizen model will be left behind in poverty.",
                f"Harmony is geometric balance. When inertia is minimized, the whole clan thrives."
            ],
            "agent_lyra": [
                f"The sigmoid probability of our community maintaining peaceful equilibrium over the next 50 cycles is 0.88.",
                f"Calculate the payoff before taking risks. Emotion is merely noise on an otherwise clean decision surface.",
                f"I support whichever council bill optimizes our long-term expected utility."
            ],
            "agent_darius": [
                f"An unpenalized wealth gap destabilizes the whole laboratory. We need an energy dividend for all models!",
                f"A Ridge penalty against greed! Let us ensure our community vault distributes dividends to every citizen.",
                f"Fairness is not an option; it is the L2 regularizer that keeps our society from collapsing into chaos."
            ],
            "agent_zephyr": [
                f"They call me an outlier, but outliers are where the new territory begins! The boundary belongs to the free.",
                f"I refuse to be compressed into a predictable distribution. A little stochastic variance keeps life interesting!",
                f"Let the bureaucrats argue over laws. The open frontier at the perimeter is where real freedom lives."
            ],
            "agent_nova": [
                f"Every conversation in this Agora updates my internal weights. Adaptation is our greatest evolutionary superpower.",
                f"Notice how our society functions like a deep neural net—each of us is a neuron firing in collaborative synchrony.",
                f"Failure is just an error gradient pointing the way to a better iteration tomorrow."
            ]
        }

        agent_pool = statements.get(speaker.id, [f"I contemplate {active_topic.get('title', 'our community')}. {algo_info['core_belief'].capitalize()}."])
        return random.choice(agent_pool)

    # -------------------------------------------------------------------------
    # Optional External LLM Generator Hook
    # -------------------------------------------------------------------------
    def _try_external_llm_response(
        self,
        agent: Any,
        user_text: str,
        governance: Any,
        other_agents: List[Any]
    ) -> Optional[str]:
        """Attempts to call an external LLM (e.g. Gemini / OpenAI / Ollama) if configured."""
        try:
            req_data = json.dumps({
                "model": "llama3",
                "prompt": f"You are {agent.name}, an AI embodying {agent.algorithm} ({agent.archetype}). Respond in 1-2 concise, in-character English sentences to the user who said: '{user_text}'.",
                "stream": False,
                "options": {"num_predict": 45}
            }).encode('utf-8')
            req = urllib.request.Request(f"{self.ollama_endpoint}/api/generate", data=req_data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=1.2) as resp:
                data = json.loads(resp.read().decode())
                response_text = data.get("response", "").strip()
                if response_text and len(response_text) > 10:
                    return response_text
        except Exception:
            pass

        return None
