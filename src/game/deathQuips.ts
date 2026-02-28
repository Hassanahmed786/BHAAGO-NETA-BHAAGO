// ─── Death Quips — obstacle × character comedy matrix ────────────────────────
import { ObstacleType } from "./Obstacle";
import { CharacterId }  from "./characters/drawCharacters";

type QuipMatrix = Partial<Record<ObstacleType, Partial<Record<CharacterId, string>>>>;

const QUIP_MAP: QuipMatrix = {
  reporter: {
    0: "MODI stopped cold by a journalist asking about electoral bonds. Vikas was unavailable for comment.",
    1: "TRUMP blocked by a CNN reporter. \"FAKE NEWS! WITCH HUNT! TOTALLY UNFAIR!\"",
    2: "RAHUL cornered mid-speech by an actual question. Transcript: [INCOHERENT]",
    3: "KEJRIWAL ambushed by press asking about the Liquor Policy. The AAP bus has left.",
    4: "BIDEN mumbles: \"C'mon man, I was doing 15 mph... I went to get ice cream...\"",
    5: "PUTIN says reporter slipped and fell. Seven times. In the back.",
  },
  subpoena: {
    0: "MODI served a subpoena about demonetisation. 2 crore jobs still M.I.A.",
    1: "TRUMP: \"This subpoena is RIGGED. The DA is CORRUPT. STOP THE SERVE!\"",
    2: "RAHUL gets disqualification papers delivered mid-yatra. Classic Tuesday.",
    3: "KEJRIWAL: summons #49 this fiscal year. Phone confiscated. AAP still tweeting.",
    4: "BIDEN squints at the document: \"Is this the menu? I'll have the chicken.\"",
    5: "PUTIN: the lawyer who served this has been reassigned to a submarine.",
  },
  cbi_agent: {
    0: "MODI caught by the CBI — who promptly forgot why they were there.",
    1: "TRUMP: \"FBI! DEEP STATE! Very unfair! Tremendous injustice!\" — handcuffed.",
    2: "RAHUL stopped by a CBI agent. First time they've caught anyone from Congress.",
    3: "KEJRIWAL tackled by the very agency he spent 5 years exposing. Poetic.",
    4: "BIDEN: \"These guys in the suits... remind me of Corn Pop. Baaaad dude.\"",
    5: "PUTIN tripped by FSB. A mistake they will not make twice.",
  },
  flying_mic: {
    0: "MODI knocked out mid-'56-inch-chest' monologue by a rogue microphone.",
    1: "TRUMP mid-speech about his 'PERFECT' phone call — silenced by mic drop.",
    2: "RAHUL asked a follow-up question by the mic. Could not compute. Crashed.",
    3: "KEJRIWAL walked face-first into his own press conference mic. Trademark move.",
    4: "BIDEN: teleprompter AND microphone team up against him. Nobody is surprised.",
    5: "PUTIN: the microphone has been charged with crimes against the state.",
  },
  chair: {
    0: "MODI tripped on a Parliament chair. GST was not in the way.",
    1: "TRUMP: \"I threw this chair at the Constitution. Democracy threw it back.\"",
    2: "RAHUL hurdled by flying Parliament furniture. Bharat Jodo... the chair.",
    3: "KEJRIWAL slipped on a folding chair at yet another press conference. Budget saved.",
    4: "BIDEN: \"I've seen this chair before. In Delaware. 1987. Very threatening.\"",
    5: "PUTIN: the chair has been sentenced to 15 years in Sakhalin Oblast.",
  },
  news_van: {
    0: "MODI flattened by a news van. Fortunately, it was government media. All fine.",
    1: "TRUMP vs. news van: \"ENEMY OF THE PEOPLE!\" — The van won. Easily.",
    2: "RAHUL ran straight into a van marked 'Enforcement Directorate'. No survivors.",
    3: "KEJRIWAL: the news van was obviously sent by the Delhi LG. He is certain.",
    4: "BIDEN: the van was going 3 mph. He never stood a chance.",
    5: "PUTIN: the news van driver has been conscripted. Effective immediately.",
  },
  ballot_box: {
    0: "MODI tripped on a ballot box. EVM conspiracy? Absolutely not. Move on.",
    1: "TRUMP: \"This ballot box is FRAUDULENT. Stop the count! Stop the run!\"",
    2: "RAHUL fumbles the ballot box. Congress loses. Again. Tradition maintained.",
    3: "KEJRIWAL: AAP wins the box but loses the ground. As per usual.",
    4: "BIDEN: 81 million votes in 2020. Could not dodge one wooden box in 2026.",
    5: "PUTIN: the ballot shows 147% vote share. Somehow, still an obstacle.",
  },
  tax_notice: {
    0: "MODI stopped by a tax notice. \"Demonetisation fixed this.\" — It did not.",
    1: "TRUMP: \"I pay LOTS of taxes. The most taxes. Ask anyone. Caught anyway.\"",
    2: "RAHUL: the tax-exempt Gandhi dynasty finally gets a notice. Historic.",
    3: "KEJRIWAL: the notice cut deeper than his austerity budget. Ouch.",
    4: "BIDEN: the IRS found the Corvette AND the classified docs. Rough day.",
    5: "PUTIN: $200B declared as personal losses. The taxman is unimpressed.",
  },
};

const GENERIC: Record<ObstacleType, string> = {
  reporter:   "Caught by a relentless reporter! The truth always catches up.",
  subpoena:   "Justice served — via subpoena. Nobody outruns the law.",
  cbi_agent:  "Tackled by an agent of the state. Even the fastest fall.",
  flying_mic: "Silenced by a flying microphone. The press always gets the last word.",
  chair:      "FURNITURE 1 — POLITICIAN 0. Democracy is chaotic.",
  news_van:   "Outpaced by the news cycle. Classic politician.",
  ballot_box: "Democracy wins. The ballot box never forgets.",
  tax_notice: "The taxman cometh. No offshore account saves you here.",
};

export function getDeathQuip(obstacle: ObstacleType, character: CharacterId): string {
  return QUIP_MAP[obstacle]?.[character] ?? GENERIC[obstacle];
}

export const OBSTACLE_LABEL: Record<ObstacleType, string> = {
  reporter:   "RELENTLESS REPORTER",
  subpoena:   "FLYING SUBPOENA",
  cbi_agent:  "CBI AGENT",
  flying_mic: "FLYING MIC",
  chair:      "PARLIAMENT CHAIR",
  news_van:   "NEWS VAN",
  ballot_box: "BALLOT BOX",
  tax_notice: "TAX NOTICE",
};

export const OBSTACLE_EMOJI: Record<ObstacleType, string> = {
  reporter:   "📰",
  subpoena:   "📜",
  cbi_agent:  "🕵️",
  flying_mic: "🎤",
  chair:      "🪑",
  news_van:   "📡",
  ballot_box: "🗳️",
  tax_notice: "📋",
};
