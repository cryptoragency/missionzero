// Cheap retrieval shared by the verifier and the page reader: the sentences that share the most words with a query.
const STOP = new Set('the a an of and or to in on for with by is are was were be as at from that this it its their his her has have had not no than then which who whom into over under about between during after before more most also can may will would could should what how many much does did'.split(' '));
// Standards write numbers in words ("a minimum of eight characters"): both sides are normalized to digits before matching.
const WORDS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000 };
export const normalizeNumbers = (s) => String(s).toLowerCase()
  .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/g, (w) => String(WORDS[w]))
  .replace(/(\d)[ ,.](?=\d{3}\b)/g, '$1'); // "20 000 000", "12,195" and "12.195" become one number
const tokens = (s) => normalizeNumbers(s).match(/[a-z0-9]{3,}|\b\d{1,2}\b/g)?.filter((w) => !STOP.has(w)) || [];
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
