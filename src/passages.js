// Cheap retrieval shared by the verifier and the page reader: the sentences that share the most words with a query.
const STOP = new Set('the a an of and or to in on for with by is are was were be as at from that this it its their his her has have had not no than then which who whom into over under about between during after before more most also can may will would could should what how many much does did'.split(' '));
const tokens = (s) => String(s).toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((w) => !STOP.has(w)) || [];
// A query that asks for a figure: sentences that carry numbers get a boost.
const WANTS_NUMBER = /\b(how many|how much|number|count|share|percent|percentage|rate|figure|year|version|date|total|minimum|maximum|length|range|fine|amount)\b|\d/i;
const HAS_NUMBER = /\d/;

// The sentences of the text that best match the query (PDF text is also split on line breaks, its "sentences" are long).
export function relevantPassages(text, query, k = 6) {
  const want = new Set(tokens(query));
  const boostNumbers = WANTS_NUMBER.test(String(query));
  const sentences = String(text).split(/(?<=[.!?])\s+|\n+/).filter((s) => s.length > 30);
  return sentences
    .map((s) => {
      const hits = tokens(s).filter((w) => want.has(w)).length;
      return { s, score: hits ? hits + (boostNumbers && HAS_NUMBER.test(s) ? 1 : 0) : 0 };
    })
    .sort((a, b) => b.score - a.score).slice(0, k).filter((x) => x.score > 0).map((x) => x.s.slice(0, 400));
}
