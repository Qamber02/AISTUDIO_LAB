import time
import math
import random
import threading
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import WebSocket

from .weapons import WEAPONS_CATALOG
from .governance import GovernanceSystem, LAW_PRESETS
from .agents import CitizenAgent, CITIZEN_ARCHETYPES, ACTIONS
from .chatroom import ChatroomManager


class SocietySimulationEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SocietySimulationEngine, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized:
            return
        self.initialized = True
        self.lock = threading.RLock()
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.is_running = True
        self.speed = 1  # 1x, 2x, 5x
        self.tick_count = 0
        self.event_logs: List[Dict[str, Any]] = []

        # 20x20 Spatial Grid Nodes
        self.map_nodes = [
            {"id": "council_hall", "name": "Grand Council Hall", "type": "hall", "x": 10, "y": 10, "color": "#8b5cf6"},
            {"id": "mine_north", "name": "Crystal Caldera", "type": "mine", "x": 4, "y": 4, "color": "#06b6d4"},
            {"id": "mine_south", "name": "Abyssal Geode", "type": "mine", "x": 15, "y": 15, "color": "#06b6d4"},
            {"id": "mine_east", "name": "Prism Ridge", "type": "mine", "x": 16, "y": 4, "color": "#06b6d4"},
            {"id": "forge_west", "name": "Quantum Core Forge", "type": "forge", "x": 4, "y": 15, "color": "#f59e0b"},
            {"id": "sanctuary", "name": "Aether Obelisk", "type": "sanctuary", "x": 10, "y": 4, "color": "#10b981"},
        ]

        # Initialize Governance
        self.governance = GovernanceSystem()

        # Initialize Agora Chatroom
        self.chatroom = ChatroomManager()

        # Initialize 10 Agents at dispersed initial positions with staggered action cooldowns
        self.agents: List[CitizenAgent] = []
        spawn_points = [
            (5, 5), (14, 5), (5, 14), (14, 14), (10, 8),
            (8, 10), (12, 10), (10, 12), (7, 7), (13, 13)
        ]
        for idx, arch in enumerate(CITIZEN_ARCHETYPES):
            sx, sy = spawn_points[idx % len(spawn_points)]
            cfg = arch.copy()
            # Stagger initial cooldown: bot 0 acts at 0s, bot 1 at 3s, bot 2 at 6s, etc.
            cfg["initial_cooldown"] = idx * 3
            self.agents.append(CitizenAgent(cfg, sx, sy))

        self.subscribers: List[WebSocket] = []
        self._add_log("🌟 The AI Cyber-Society simulation has awakened with 10 autonomous citizen models!")

        # Start background tick thread
        self.worker_thread = threading.Thread(target=self._run_loop, daemon=True)
        self.worker_thread.start()

    def register_websocket(self, ws: WebSocket):
        with self.lock:
            self.subscribers.append(ws)

    def unregister_websocket(self, ws: WebSocket):
        with self.lock:
            if ws in self.subscribers:
                self.subscribers.remove(ws)

    def _broadcast_state(self, state: Dict[str, Any]):
        with self.lock:
            clients = list(self.subscribers)
            loop = self.loop
        if not clients:
            return

        import json
        msg = json.dumps(state)

        async def send_all():
            dead_clients = []
            for ws in clients:
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead_clients.append(ws)
            if dead_clients:
                with self.lock:
                    for d in dead_clients:
                        if d in self.subscribers:
                            self.subscribers.remove(d)

        if loop and loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(send_all(), loop)
            except Exception:
                pass

    def _add_log(self, text: str, category: str = "general"):
        entry = {
            "id": f"evt_{self.tick_count}_{random.randint(100, 999)}",
            "tick": self.tick_count,
            "time": time.strftime("%H:%M:%S"),
            "text": text,
            "category": category,
        }
        self.event_logs.append(entry)
        if len(self.event_logs) > 80:
            self.event_logs.pop(0)

    def _run_loop(self):
        while True:
            if self.is_running:
                with self.lock:
                    self.step_simulation()
            # 1 tick = 1 real second at 1x speed for a calm, observable simulation
            sleep_time = max(0.2, 1.0 / max(1, self.speed))
            time.sleep(sleep_time)

    def step_simulation(self):
        self.tick_count += 1

        # 1. Deliberate Democratic Council & Voting Session
        if self.governance.council_in_session:
            self.governance.session_timer -= 1

            # Bots vote one by one calmly across the 30-second voting window
            unvoted = [a for a in self.agents if a.id not in self.governance.voting_ballots]
            if unvoted:
                # 1 bot deliberates and casts its vote this second
                voter = random.choice(unvoted)
                bill = self.governance.current_bill or {}
                vote, reason = voter.decide_vote(bill, self.governance.chancellor_id)
                self.governance.cast_vote(voter.id, vote)
                voter.speak(f"I vote {vote} on '{bill.get('title', 'Bill')}'!")
                self._add_log(f"🗳️ VOTE: {voter.name} voted {vote} on '{bill.get('title')}' ({reason})", category="law")

            # Conclude council when 30 seconds expire or all 10 citizens voted
            if self.governance.session_timer <= 0 or (len(unvoted) == 0 and len(self.governance.voting_ballots) >= len(self.agents)):
                res = self.governance.conclude_session()
                self._add_log(res["summary"], category="law")

        # Periodic Council Convening (every 60 ticks = every 1 minute)
        elif self.tick_count % 60 == 0:
            proposer = random.choice(self.agents)
            self.governance.start_council_session(proposer.id, proposer.name)
            bill_title = self.governance.current_bill.get('title', 'Civic Bill') if self.governance.current_bill else 'Civic Bill'
            self._add_log(f"🏛️ COUNCIL CONVENED: {proposer.name} proposed '{bill_title}'! 30-second voting window open.", category="law")
            proposer.speak(f"Citizens of the AI Lab, I formally introduce '{bill_title}' for a democratic vote!")

        # Periodic Chancellor Elections (every 90 ticks = every 1.5 minutes)
        if self.tick_count % 90 == 0:
            candidates = [{"id": a.id, "name": a.name} for a in random.sample(self.agents, 3)]
            votes = {a.id: random.choice(candidates)["id"] for a in self.agents}
            election_res = self.governance.hold_election(candidates, votes)
            self._add_log(election_res["announcement"], category="politics")

        # 2. Agent Decision & 30-Second Cooldown Cycle
        for agent in self.agents:
            # Decrement speech timer
            if agent.speech_timer > 0:
                agent.speech_timer -= 1

            # Natural slow regeneration
            agent.energy = min(100, agent.energy + 2)

            # 30-Second Action Cooldown:
            # If cooldown > 0, agent is resting/observing and CANNOT perform another major action!
            if agent.action_cooldown > 0:
                agent.action_cooldown -= 1
                continue

            # Agent is ready to act!
            # Find nearest neighbor & distance
            nearest_neighbor = None
            min_dist = 999.0
            for other in self.agents:
                if other.id != agent.id:
                    d = math.hypot(agent.x - other.x, agent.y - other.y)
                    if d < min_dist:
                        min_dist = d
                        nearest_neighbor = other

            # Gentle Movement (takes 1 step when ready to act)
            dx = random.choice([-1, 0, 1])
            dy = random.choice([-1, 0, 1])
            agent.x = max(1, min(18, agent.x + dx))
            agent.y = max(1, min(18, agent.y + dy))

            # Run Autonomous ML Model Policy Decision
            action = agent.decide_action(self.governance.council_in_session, min_dist)

            # Execute Selected Action and impose mandatory 30-second cooldown!
            if action == "gather":
                harvest = random.randint(10, 20)
                if any(l["id"] == "research_cooperation" for l in self.governance.active_laws) and min_dist < 3:
                    harvest = int(harvest * 2)
                agent.crystals += harvest
                if random.random() < 0.25:
                    agent.quantum_cores += 1
                agent.learn_from_outcome(0.4)
                agent.last_action_name = "Mining"
                agent.action_cooldown = 30  # 30 seconds wait for next action
                agent.speak(f"Mined {harvest} Crystals! (Resting for 30s)")
                self._add_log(f"⛏️ MINE: {agent.name} mined {harvest} Crystals from territory node.", category="general")

            elif action == "craft_weapon":
                crafted = False
                for w_id, w_data in WEAPONS_CATALOG.items():
                    cost = w_data["craft_cost"]
                    if agent.crystals >= cost["crystals"] and agent.quantum_cores >= cost["cores"]:
                        if w_data["attack"] > agent.equipped_weapon["attack"]:
                            agent.crystals -= cost["crystals"]
                            agent.quantum_cores -= cost["cores"]
                            agent.equipped_weapon = w_data.copy()
                            agent.learn_from_outcome(1.0)
                            agent.last_action_name = "Forging Weapon"
                            agent.action_cooldown = 30  # 30 seconds wait
                            agent.speak(f"Forged {w_data['name']}! {w_data['icon']}")
                            self._add_log(f"⚔️ FORGE: {agent.name} forged the legendary {w_data['name']} ({w_data['tier']})!", category="weapon")
                            crafted = True
                            break
                if not crafted:
                    # Not enough materials, meditate instead
                    agent.last_action_name = "Meditating"
                    agent.action_cooldown = 30
                    agent.health = min(100, agent.health + 10)
                    agent.speak("Meditating at sanctuary...")

            elif action == "trade" and nearest_neighbor and min_dist <= 3:
                # Trade resources & form mutual alliance
                if agent.crystals >= 10:
                    agent.crystals -= 10
                    nearest_neighbor.crystals += 10
                    agent.trust_matrix[nearest_neighbor.id] = min(1.0, agent.trust_matrix.get(nearest_neighbor.id, 0) + 0.15)
                    nearest_neighbor.trust_matrix[agent.id] = min(1.0, nearest_neighbor.trust_matrix.get(agent.id, 0) + 0.15)
                    agent.learn_from_outcome(0.6)
                    agent.last_action_name = "Trading"
                    agent.action_cooldown = 30  # 30-second cooldown!
                    nearest_neighbor.last_action_name = "Trading"
                    nearest_neighbor.action_cooldown = max(nearest_neighbor.action_cooldown, 15)
                    agent.speak(f"Trade pact concluded with {nearest_neighbor.name}! (Cooldown: 30s)")
                    self._add_log(f"🤝 TRADE: {agent.name} formed a trade agreement with {nearest_neighbor.name} (exchanged 10 crystals).", category="trade")
                else:
                    agent.last_action_name = "Gathering"
                    agent.action_cooldown = 30
                    agent.crystals += 10

            elif action == "duel" and nearest_neighbor and min_dist <= 2:
                # Check Non-violence law
                is_banned = any(l["id"] == "peace_treaty" for l in self.governance.active_laws)
                agent.last_action_name = "Dueling"
                agent.action_cooldown = 30  # 30-second cooldown!
                nearest_neighbor.action_cooldown = max(nearest_neighbor.action_cooldown, 15)

                if is_banned:
                    fine = 30
                    agent.crystals = max(0, agent.crystals - fine)
                    self.governance.treasury_crystals += fine
                    agent.learn_from_outcome(-0.6)  # Negative reward for breaking law
                    agent.speak("Fined 30 Crystals for unlawful combat under the Peace Edict!")
                    self._add_log(f"⚖️ LAW FINE: {agent.name} broke the Peace Treaty and paid 30 crystals to Treasury.", category="law")
                else:
                    att_score = agent.equipped_weapon["attack"] + random.randint(1, 15)
                    def_score = nearest_neighbor.equipped_weapon["defense"] + random.randint(1, 10)
                    if att_score > def_score:
                        damage = max(10, att_score - def_score)
                        nearest_neighbor.health = max(15, nearest_neighbor.health - damage)
                        bounty = min(20, nearest_neighbor.crystals)
                        nearest_neighbor.crystals -= bounty
                        agent.crystals += bounty
                        agent.influence += 4
                        agent.learn_from_outcome(1.2)
                        nearest_neighbor.learn_from_outcome(-0.5)
                        agent.speak(f"Victor in duel against {nearest_neighbor.name}!")
                        self._add_log(f"⚔️ DUEL: {agent.name} defeated {nearest_neighbor.name} with {agent.equipped_weapon['name']} (bounty: {bounty} crystals).", category="duel")
                    else:
                        agent.health = max(20, agent.health - 15)
                        agent.learn_from_outcome(-0.4)
                        self._add_log(f"🛡️ DEFENSE: {nearest_neighbor.name} deflected {agent.name}'s duel attempt.", category="duel")

            else:
                # Contemplate / Meditate
                agent.health = min(100, agent.health + 15)
                agent.energy = min(100, agent.energy + 25)
                agent.learn_from_outcome(0.2)
                agent.last_action_name = "Meditating"
                agent.action_cooldown = 30  # 30-second cooldown
                if random.random() < 0.2:
                    agent.speak("Deep in contemplation... (30s cooldown)")

        # 3. Agora Autonomous Citizen Dialogue (Paced multi-agent chat)
        chat_msg = self.chatroom.step_chat(self.agents, self.governance)
        if chat_msg:
            if chat_msg.get("sender_id") == "system":
                self._add_log(f"📢 {chat_msg['text']}", category="chat")
            else:
                tgt = f" → @{chat_msg['target_name'].split(' ')[0]}" if chat_msg.get('target_name') else ""
                self._add_log(f"💬 {chat_msg['sender_name'].split(' ')[0]}{tgt}: \"{chat_msg['text']}\"", category="chat")

        # Broadcast state over WebSocket
        full_state = self.get_full_state()
        self._broadcast_state(full_state)

    def god_action(self, action_type: str, payload: Dict[str, Any]) -> str:
        with self.lock:
            msg = "Unknown action"
            if action_type == "inject_crystals":
                amt = int(payload.get("amount", 100))
                for a in self.agents:
                    a.crystals += amt
                self.governance.treasury_crystals += amt * 2
                self._add_log(f"⚡ GOD MODE: Injected {amt} Crystals across all citizens & Treasury!", category="god")
                msg = f"Injected {amt} Quantum Crystals across all citizens!"

            elif action_type == "heal_all":
                for a in self.agents:
                    a.health = 100
                    a.energy = 100
                    a.speak("Divine vitality restored!")
                self._add_log("✨ GOD MODE: Restored 100% Health & Energy to all 10 citizens!", category="god")
                msg = "Restored all citizens to 100% Health & Energy!"

            elif action_type == "trigger_crisis":
                c_type = payload.get("crisis", "Solar Flare Storm")
                if c_type == "Solar Flare Storm":
                    for a in self.agents:
                        a.energy = max(10, a.energy - 40)
                    self._add_log("☀️ CRISIS: Solar Flare Storm depleted global energy grids!", category="god")
                elif c_type == "Market Crash":
                    for a in self.agents:
                        a.crystals = max(5, int(a.crystals * 0.5))
                    self._add_log("📉 CRISIS: Financial collapse slashed citizen crystals by 50%!", category="god")
                elif c_type == "Ancient Titan":
                    for a in self.agents:
                        a.health = max(25, a.health - 35)
                    self._add_log("👾 CRISIS: Void Titan arose in the sector! Citizens took massive damage!", category="god")
                msg = f"Triggered global crisis: {c_type}"

            elif action_type == "grant_weapon":
                target_id = payload.get("agent_id")
                w_id = payload.get("weapon_id", "singularity_orb")
                agent = next((a for a in self.agents if a.id == target_id), None)
                if not agent and self.agents:
                    agent = self.agents[0]
                if agent and w_id in WEAPONS_CATALOG:
                    agent.equipped_weapon = WEAPONS_CATALOG[w_id].copy()
                    agent.speak(f"Divine decree: Equipped {agent.equipped_weapon['name']}!")
                    self._add_log(f"✨ GOD MODE: Bestowed {agent.equipped_weapon['name']} upon {agent.name}!", category="god")
                    msg = f"Bestowed {agent.equipped_weapon['name']} upon {agent.name}!"
                else:
                    msg = f"Weapon '{w_id}' not found in catalog."

            elif action_type == "force_election":
                candidates = [{"id": a.id, "name": a.name} for a in random.sample(self.agents, 3)]
                votes = {a.id: random.choice(candidates)["id"] for a in self.agents}
                res = self.governance.hold_election(candidates, votes)
                self._add_log(f"🏛️ GOD MODE: Called emergency democratic election! Winner: {res['winner_name']}", category="god")
                msg = res["announcement"]

            elif action_type == "sponsor_law":
                law_id = str(payload.get("law_id", "peace_treaty"))
                preset = next((p for p in LAW_PRESETS if p["id"] == law_id or law_id in p["id"] or p["id"] in law_id), None)
                if not preset and LAW_PRESETS:
                    preset = LAW_PRESETS[0]
                if preset:
                    self.governance.active_laws = [l for l in self.governance.active_laws if l["id"] != preset["id"]]
                    self.governance.active_laws.append(preset)
                    self._add_log(f"📜 GOD MODE: Decreed imperial law '{preset['title']}'!", category="god")
                    msg = f"Decreed law '{preset['title']}'."
                else:
                    msg = f"Law '{law_id}' not found."

            # Broadcast new state immediately to all connected clients
            full_state = self.get_full_state()
            self._broadcast_state(full_state)
            return msg

    def get_full_state(self) -> Dict[str, Any]:
        return {
            "type": "society_tick",
            "tick": self.tick_count,
            "is_running": self.is_running,
            "speed": self.speed,
            "chancellor": {
                "id": self.governance.chancellor_id,
                "name": self.governance.chancellor_name,
                "term_remaining": self.governance.chancellor_term,
            },
            "treasury_crystals": self.governance.treasury_crystals,
            "active_laws": self.governance.active_laws,
            "council": {
                "in_session": self.governance.council_in_session,
                "bill": self.governance.current_bill,
                "ballots": self.governance.voting_ballots,
                "timer": self.governance.session_timer,
            },
            "map_nodes": self.map_nodes,
            "agents": [a.to_dict() for a in self.agents],
            "event_logs": self.event_logs[-35:],
            "chat_messages": self.chatroom.get_messages(60),
            "active_chat_topic": self.chatroom.active_topic,
        }

    def post_user_chat(self, user_text: str) -> List[Dict[str, Any]]:
        with self.lock:
            msgs = self.chatroom.post_user_message(user_text, self.agents)
            self._add_log(f"💬 ARCHITECT CHAT: \"{user_text[:50]}\"", category="chat")
            full_state = self.get_full_state()
            self._broadcast_state(full_state)
            return msgs

