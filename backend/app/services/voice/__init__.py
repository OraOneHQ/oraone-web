"""Voice platform service layer (Product 2).

This package implements Voice as an *additional channel* on the existing
Agent architecture. It deliberately reuses Product 1's Agent Runtime, RAG,
Knowledge and Workflows — there is no second AI here.

Submodules
----------
* :mod:`app.services.voice.config`     — env-driven settings
* :mod:`app.services.voice.providers`  — telephony provider abstraction (Twilio, …)
* :mod:`app.services.voice.stt`        — speech-to-text abstraction (Deepgram, …)
* :mod:`app.services.voice.tts`        — text-to-speech abstraction (ElevenLabs, …)
* :mod:`app.services.voice.session`    — Redis/in-memory voice session manager
* :mod:`app.services.voice.agent_bridge` — transcript → Agent Runtime → reply
* :mod:`app.services.voice.analytics`  — voice analytics event capture
"""
