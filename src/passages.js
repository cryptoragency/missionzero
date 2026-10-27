// Cheap retrieval shared by the verifier and the page reader: the sentences that share the most words with a query.
const STOP = new Set('the a an of and or to in on for with by is are was were be as at from that this it its their his her has have had not no than then which who whom into over under about between during after before more most also can may will would could should'.split(' '));
const tokens = (s) => String(s).toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((w) => !STOP.has(w)) || [];

// Cheap retrieval: the sentences of the page that share the most words with the claim.
export function relevantPassages(text, claim, k = 6) {
  const want = new Set(tokens(claim));
  const sentences = String(text).split(/(?<=[.!?])\s+/).filter((s) => s.length > 30);
  return sentences
    .map((s) => ({ s, score: tokens(s).filter((w) => want.has(w)).length }))
    .sort((a, b) => b.score - a.score).slice(0, k).filter((x) => x.score > 0).map((x) => x.s.slice(0, 400));
}
