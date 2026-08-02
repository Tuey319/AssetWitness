def select_documents(case_type: str, needs_dispute_resolution: bool) -> dict:
    """
    Determine which documents Agent 04 should generate for this handover.

    Unlike RoomWitness's routing (which court to file in, based on landlord
    unit count), this isn't about legal venue — every handover gets a
    condition certification report, fit-out cases additionally get a
    completion checklist, and disputed items additionally get a liability
    summary. There's no "route," just a document set.

    Args:
        case_type: "move_in" | "move_out" | "fit_out_inspection".
        needs_dispute_resolution: True if any item's responsibility came back DISPUTED.

    Returns:
        Dict with keys:
            documents_to_generate: list of document type strings
            note: Optional guidance string (None if not needed)
    """
    documents = ["condition_certification_report"]
    note = None

    if case_type == "fit_out_inspection":
        documents.append("fit_out_completion_checklist")

    if needs_dispute_resolution:
        documents.append("liability_summary")
        note = (
            "One or more items came back DISPUTED — a liability summary was generated "
            "for Dispute Resolution Support. This is evidence for a human decision, not a final verdict."
        )

    return {"documents_to_generate": documents, "note": note}
