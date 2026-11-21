export const DISKS = [
  { slug: 'uva-bsc', name: 'UVA.PHYS+PHIL', stripe: '#4a3fd0', page: [
    ['University of Amsterdam  \'07-\'11', 'BSc Beta-gamma', 'Major physics, minor philosophy'],
    ['Aristotle Award \'08:', 'best interdisciplinary research']] },
  { slug: 'uva-msc', name: 'UVA.MSC.PHYSICS', stripe: '#d77a7a', page: [
    ['University of Amsterdam  \'12-\'14', 'MSc Physics', 'Track: Advanced Matter and', 'Energy Physics']] },
  { slug: 'amolf', name: 'AMOLF.OPTOMECH', stripe: '#d8d050', page: [
    ['AMOLF  \'13-\'14', 'Physics researcher, optomechanics'],
    ['Built the software for real-time', 'signal acquisition and analysis in', 'light-matter experiments. Automated',
      'a nanophotonic optomechanical setup', 'for quantum-state control.'],
    ['Phys. Rev. Lett. 115, 203904 (\'15)', 'editorial highlight']],
    links: [{ href: 'https://doi.org/10.1103/PhysRevLett.115.203904', label: 'Phys. Rev. Lett. 115, 203904' }] },
  { slug: 'vu', name: 'VU.2DES', stripe: '#b0372c', page: [
    ['Vrije Universiteit / Laserlab', 'Amsterdam  \'14-\'16', 'Physics researcher,', '2D electronic spectroscopy'],
    ['Designed the software platform of a', '2D electronic spectroscopy setup:', 'calibration, signal optimisation,',
      'global analysis. Quantum effects in', 'photosynthetic systems.'],
    ['Sci. Rep. 6 (\'16) - JACS (\'16)', 'University Research Fellow \'15-\'16']],
    links: [{ href: 'https://doi.org/10.1038/srep20834', label: 'Scientific Reports 6' },
      { href: 'https://doi.org/10.1021/jacs.6b11017', label: 'JACS' }] },
  { slug: 'pggm', name: 'PGGM.DATASCI', stripe: '#7a4f22', page: [
    ['PGGM  \'16-\'17', 'Data science consultant'],
    ['Early build-out of one of PGGM\'s', 'first data-science teams.', 'Prototypes: call-centre forecasting,',
      'fraud and bankruptcy risk, client', 'profiling, micro-targeted marketing.']] },
  { slug: 'wartsila', name: 'WARTSILA.ML', stripe: '#4a3fd0', page: [
    ['Wartsila  \'18', 'Machine learning engineer'],
    ['A reusable market-prediction ML', 'solution: from proof of concept to a', 'client-ready Python package with a',
      'production-ready ML pipeline.']] },
  { slug: 'tele2', name: 'TELE2.VOICE', stripe: '#9a3fb0', page: [
    ['Tele2  \'18-\'19', 'Lead data scientist'],
    ['End-to-end 4G voice-quality', 'analytics on call detail records:', 'performance monitoring, root-cause',
      'analysis, degradation modelling.']] },
  { slug: 'ing', name: 'ING.COLLECTIONS', stripe: '#e07a1f', page: [
    ['ING  \'19-\'21', 'Chapter lead data science'],
    ['Machine learning to scale', 'collections operations, leading a', 'data science / analytics chapter.',
      'Likelihood-to-pay and early-', 'intervention prevention models.']] },
  { slug: 'schiphol-sim', name: 'SCHIPHOL.SIM', stripe: '#6fa8dc', page: [
    ['Royal Schiphol Group  \'21-\'23', 'Senior data scientist'],
    ['Airport operational simulation and', 'forecasting: passenger departure', 'flow, queue lengths, waiting time,',
      'demand and capacity prediction,', 'runway capacity modelling.'],
    ['The case: LOAD"SIMULATIONS",8']] },
  { slug: 'steel', name: 'STEEL.TWIN', stripe: '#8a8a8a', page: [
    ['Danieli Corus  \'23', 'Technical lead,', 'steel plant simulation'],
    ['A modular, real-time digital twin of', 'a steel plant for what-if', 'simulations: capacity planning and',
      'scheduling. A digital-shadow tool', 'for bottleneck detection.']] },
  { slug: 'eneco', name: 'ENECO.SQUAD', stripe: '#3c9a3c', page: [
    ['Eneco  \'23-\'25', 'Lead data scientist'],
    ['Built the company\'s first data', 'science squad. The first fully', 'automated topic-modelling pipeline',
      'for CX: voice transcription at', 'scale, embedding, clustering,', 'summarisation.']] },
  { slug: 'schiphol-llm', name: 'SCHIPHOL.LLM', stripe: '#3fc0c8', page: [
    ['Schiphol  \'25', 'AI solution engineer'],
    ['LLM-powered CX assistants on Azure', 'OpenAI Service. A modular framework', 'on LangChain, LangGraph, Redis',
      'memory and FastAPI: intent', 'classification, hybrid RAG, agentic', 'tool use. Multi-tenant.'],
    ['The case: LOAD"AGENTS",8']] },
  { slug: 'emissary', name: 'EMISSARY', stripe: '#e8e2cc' },
  { slug: 'master', name: 'MASTER', stripe: '#e8e2cc' },
];
export const CV = DISKS.filter((d) => d.page).length;
export const bySlug = (s) => DISKS.find((d) => d.slug === s) ?? null;
export const byName = (n) => DISKS.find((d) => d.name === n) ?? null;
export const number = (d) => String(DISKS.indexOf(d) + 1).padStart(2, '0');
export function screenRows(d) {
  const rows = [];
  d.page.forEach((b, i) => { if (i) rows.push(''); rows.push(...b.map((l) => l.toUpperCase())); });
  return rows;
}
const CARD_WORDS = [[/\bBeta-gamma\b/g, 'Bèta-gamma'], [/\bWartsila\b/g, 'Wärtsilä']];
export function cardText(d) {
  const join = (b, sep) => b.reduce((s, l) => (!s ? l : s.endsWith('-') && sep === ' ' ? s + l : /([,:]| and)$/.test(s) ? `${s} ${l}` : `${s}${sep}${l}`), '');
  const t = d.page.map((b) => join(b.map((l) => l.replace(/ {2,}/g, ' ')), b.at(-1).endsWith('.') ? ' ' : '\n')).join('\n\n');
  return CARD_WORDS.reduce((s, [re, w]) => s.replace(re, w), t);
}
