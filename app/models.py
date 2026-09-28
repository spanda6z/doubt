from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


VerdictType = Literal["SAFE", "CAUTION", "RISKY", "AVOID"]
ConfidenceType = Literal["LOW", "MEDIUM", "HIGH"]
SeverityType = Literal["red", "yellow", "blue"]


class ExitBuy(BaseModel):
    exit_value: float
    delta_pct: float


class ExitMath(BaseModel):
    buy_100: ExitBuy
    buy_500: ExitBuy
    buy_5000: ExitBuy
    cascade_500: ExitBuy
    time_to_exit_minutes: int
    mev_tax_pct: float


class TopSeller(BaseModel):
    wallet: str
    amount_usd: float
    solscan: str


class ReverseFlow(BaseModel):
    ratio: float
    smart_in_usd: float
    insider_out_usd: float
    top_sellers: list[TopSeller] = Field(default_factory=list)
    sniper_offload_count: int = 0
    dev_wallet_status: str = "unknown"
    buys: int = 0
    sells: int = 0
    unique_buyers: int = 0
    unique_sellers: int = 0
    buy_pressure: float = 50.0
    confidence: ConfidenceType = "LOW"
    source: str = "unavailable"


class DeathData(BaseModel):
    narrative_tag: str = "other"
    age_basis: str = "unavailable"
    stage: str = "UNKNOWN"
    median_lifespan_minutes: int = 0
    current_age_minutes: int = 0
    survival_6h: float = 0.0
    survival_24h: float = 0.0
    holder_velocity: float = 0.0
    volume_decay: float = 1.0


class Reason(BaseModel):
    text: str
    severity: SeverityType
    evidence: Optional[str] = None


class Scores(BaseModel):
    exit: int
    flow: int
    death: int


class VerdictResponse(BaseModel):
    mint: str
    symbol: str
    name: str
    image_url: Optional[str] = None
    verdict: VerdictType
    rug_probability: int
    combined_score: int
    scores: Scores
    exit_math: ExitMath
    reverse_flow: ReverseFlow
    death_data: DeathData
    reasons: list[Reason]
    confidence: ConfidenceType
    computed_at: datetime
    tweet_text: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "doubt"
    version: str = "0.1.0"


class WebhookAck(BaseModel):
    received: bool = True
    processed: int = 0
