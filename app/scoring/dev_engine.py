"""Creator/deployer trace from observable Helius evidence.

This is deliberately conservative: a fee payer or authority is a candidate,
not proof of token authorship. Historical launch counts are never inferred
from generic token activity.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class DevOutputs:
    creator_candidate: str | None
    authority_addresses: list[str]
    observed_related_mints: list[str]
    earliest_observed_signature: str | None
    confidence: str
    source: str


def _first_signer(tx: dict[str, Any]) -> str | None:
    for key in ("feePayer", "fee_payer"):
        if tx.get(key):
            return str(tx[key])
    for signer in tx.get("signers") or []:
        if isinstance(signer, str):
            return signer
        if isinstance(signer, dict) and signer.get("address"):
            return str(signer["address"])
    return None


def compute_dev(
    metadata: dict[str, Any],
    transactions: list[dict[str, Any]],
    mint: str,
) -> DevOutputs:
    authorities = []
    for item in metadata.get("authorities") or []:
        if isinstance(item, dict) and item.get("address"):
            address = str(item["address"])
            if address not in authorities:
                authorities.append(address)

    ordered = list(reversed(transactions))
    creator = None
    signature = None
    for tx in ordered:
        signer = _first_signer(tx)
        if signer:
            creator = signer
            signature = tx.get("signature") or tx.get("transactionSignature")
            break

    related: set[str] = set()
    for tx in transactions:
        for transfer in tx.get("tokenTransfers") or []:
            m = transfer.get("mint")
            if m and m != mint:
                related.add(str(m))

    if creator and authorities:
        confidence = "MEDIUM"
    elif creator or authorities:
        confidence = "LOW"
    else:
        confidence = "LOW"

    return DevOutputs(
        creator_candidate=creator,
        authority_addresses=authorities,
        observed_related_mints=sorted(related)[:20],
        earliest_observed_signature=str(signature) if signature else None,
        confidence=confidence,
        source="helius_asset_and_recent_transactions",
    )
