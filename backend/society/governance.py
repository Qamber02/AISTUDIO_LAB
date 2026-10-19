import random
from typing import Dict, Any, List, Optional

LAW_PRESETS = [
    {
        "id": "peace_treaty",
        "title": "Edict of Non-Violence",
        "description": "Duels are strictly banned in civilized sectors. Duelists face a 30-Crystal fine.",
        "effect": "no_duels",
        "penalty": 30
    },
    {
        "id": "welfare_energy",
        "title": "Universal Energy Dividend",
        "description": "High-wealth citizens contribute 15% crystal tax; distributed evenly to the needy.",
        "effect": "wealth_tax",
        "tax_rate": 0.15
    },
    {
        "id": "weapon_licensing",
        "title": "High-Tier Arms Regulation",
        "description": "Mythic & Singularity weapons require at least 50 community influence to wield.",
        "effect": "arms_control",
        "influence_req": 50
    },
    {
        "id": "research_cooperation",
        "title": "Open Technological Commune",
        "description": "Resource mining efficiency is doubled when two or more citizens occupy the same sector.",
        "effect": "coop_mining",
        "boost": 2.0
    },
    {
        "id": "martial_law",
        "title": "Executive Martial Authority",
        "description": "The elected Chancellor can seize up to 25 crystals from rival factions for the treasury.",
        "effect": "martial_law",
        "seizure": 25
    }
]


class GovernanceSystem:
    def __init__(self):
        self.active_laws: List[Dict[str, Any]] = [
            LAW_PRESETS[0].copy()  # Initially Edict of Non-Violence is active
        ]
        self.chancellor_id: Optional[str] = "agent_aria"
        self.chancellor_name: str = "Aria the Deep Seeker"
        self.chancellor_term: int = 60
        self.treasury_crystals: int = 150
        self.current_bill: Optional[Dict[str, Any]] = None
        self.voting_ballots: Dict[str, str] = {}  # agent_id -> "AYE" or "NAY"
        self.council_in_session: bool = False
        self.session_timer: int = 0

    def start_council_session(self, proponent_id: str, proponent_name: str, law_preset: Optional[Dict[str, Any]] = None):
        if not law_preset:
            available = [p for p in LAW_PRESETS if not any(l["id"] == p["id"] for l in self.active_laws)]
            law_preset = random.choice(available if available else LAW_PRESETS)

        self.current_bill = {
            **law_preset,
            "proponent_id": proponent_id,
            "proponent_name": proponent_name,
        }
        self.voting_ballots = {}
        self.council_in_session = True
        self.session_timer = 30  # Calm 30-second voting window for bots

    def cast_vote(self, agent_id: str, vote: str):
        if self.council_in_session and self.current_bill:
            self.voting_ballots[agent_id] = vote

    def conclude_session(self) -> Dict[str, Any]:
        if not self.current_bill:
            self.council_in_session = False
            return {"passed": False, "summary": "No bill under debate."}

        aye_count = sum(1 for v in self.voting_ballots.values() if v == "AYE")
        nay_count = sum(1 for v in self.voting_ballots.values() if v == "NAY")
        passed = aye_count > nay_count

        result_bill = self.current_bill
        if passed:
            # Replace existing law with same id or append
            self.active_laws = [l for l in self.active_laws if l["id"] != result_bill["id"]]
            self.active_laws.append(result_bill)

        self.council_in_session = False
        self.current_bill = None
        return {
            "passed": passed,
            "title": result_bill["title"],
            "ayes": aye_count,
            "nays": nay_count,
            "summary": f"Law '{result_bill['title']}' {'PASSED' if passed else 'FAILED'} with {aye_count} Ayes vs {nay_count} Nays!"
        }

    def hold_election(self, candidates: List[Dict[str, str]], votes: Dict[str, str]) -> Dict[str, Any]:
        tally: Dict[str, int] = {}
        for cand in candidates:
            tally[cand["id"]] = 0
        for voter_id, voted_cand in votes.items():
            if voted_cand in tally:
                tally[voted_cand] += 1

        winner_id = max(tally.keys(), key=lambda k: tally[k])
        winner_name = next((c["name"] for c in candidates if c["id"] == winner_id), "Unknown")

        self.chancellor_id = winner_id
        self.chancellor_name = winner_name
        self.chancellor_term = 30

        return {
            "winner_id": winner_id,
            "winner_name": winner_name,
            "tally": tally,
            "announcement": f"🏛️ ELECTION COMPLETE: {winner_name} has been democratically elected Chancellor!"
        }
