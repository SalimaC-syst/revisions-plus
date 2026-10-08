// Module test « Histoire 5e : Byzance et l'Europe carolingienne ».
// Reprend les contenus de l'ancien site (source LEGACY) et les complète d'après le
// programme officiel de 5e. À CONFRONTER AU COURS DE L'ENSEIGNANT avant publication réelle.
import P from "../../scripts/map-places.json";

export const EVAL = {
  title: "Byzance et l'Europe carolingienne",
  teacherName: "Professeur d'histoire-géographie",
  chapters: ["H1 · Byzance et l'Europe carolingienne (thème 1 : Chrétientés et islam, VIe-XIIIe siècles)"],
  objectives: [
    "Situer dans le temps : 330, 800, 1054, 1453",
    "Localiser Constantinople, Rome et Aix-la-Chapelle",
    "Expliquer comment Charlemagne gouverne son empire",
    "Décrire le pouvoir de l'empereur byzantin",
    "Connaître et employer le vocabulaire du chapitre",
  ],
};

const REF = "Préparé d'après le programme de 5e — à confronter au cours de l'enseignant";
const LEGACY = "Ancien site Révisions+ (index.html)";

export const NOTIONS = ["Repères chronologiques", "L'Empire byzantin", "L'Empire carolingien", "Vocabulaire", "Localiser sur une carte", "Chrétiens d'Orient et d'Occident"];

export const BLOCKS = [
  { type: "KEYPOINTS", title: "L'essentiel en cinq points", notion: null, data: { items: [
    "Au Moyen Âge, deux empires chrétiens se partagent l'ancien Empire romain : l'Empire byzantin à l'est et l'Empire carolingien à l'ouest.",
    "L'Empire byzantin a pour capitale Constantinople. Son empereur, le basileus, dirige l'État et protège l'Église.",
    "Charlemagne, roi des Francs, est couronné empereur par le pape à Rome le 25 décembre 800. Sa capitale est Aix-la-Chapelle.",
    "Pour gouverner son immense empire, Charlemagne s'appuie sur les comtes, contrôlés par les missi dominici, et fait appliquer ses lois, les capitulaires.",
    "En 1054, le schisme sépare les chrétiens d'Orient (orthodoxes) et les chrétiens d'Occident (catholiques).",
  ] } },
  { type: "TIMELINE", title: "Frise chronologique", notion: "Repères chronologiques", data: { events: [
    { year: 330, date: "330", label: "Fondation de Constantinople par l'empereur Constantin" },
    { year: 527, date: "527-565", label: "Règne de Justinien, empereur byzantin" },
    { year: 537, date: "537", label: "Inauguration de la basilique Sainte-Sophie à Constantinople" },
    { year: 800, date: "25 décembre 800", label: "Charlemagne est couronné empereur à Rome par le pape" },
    { year: 814, date: "814", label: "Mort de Charlemagne" },
    { year: 843, date: "843", label: "Traité de Verdun : l'empire est partagé entre les trois petits-fils de Charlemagne" },
    { year: 1054, date: "1054", label: "Schisme entre l'Église d'Orient et l'Église d'Occident" },
    { year: 1453, date: "1453", label: "Prise de Constantinople par les Turcs ottomans : fin de l'Empire byzantin" },
  ] } },
  { type: "DEFINITIONS", title: "Le vocabulaire à connaître", notion: "Vocabulaire", data: { items: [
    { term: "Basileus", definition: "Titre de l'empereur byzantin." },
    { term: "Patriarche", definition: "Chef de l'Église chrétienne d'Orient, à Constantinople." },
    { term: "Pape", definition: "Chef de l'Église chrétienne d'Occident, à Rome." },
    { term: "Schisme", definition: "Séparation entre deux Églises. En 1054, l'Église d'Orient (orthodoxe) se sépare de l'Église d'Occident (catholique)." },
    { term: "Missi dominici", definition: "« Envoyés du maître » : ils vont par deux dans l'empire pour contrôler les comtes au nom de Charlemagne." },
    { term: "Comte", definition: "Représentant de l'empereur dans une région appelée comté." },
    { term: "Capitulaire", definition: "Loi écrite décidée par Charlemagne." },
    { term: "Icône", definition: "Image religieuse peinte, vénérée par les chrétiens orthodoxes." },
  ] } },
  { type: "TABLE", title: "Comparer les deux empires chrétiens", notion: "Chrétiens d'Orient et d'Occident", data: {
    headers: ["", "Empire byzantin", "Empire carolingien"],
    rows: [
      ["Capitale", "Constantinople", "Aix-la-Chapelle"],
      ["Souverain célèbre", "Justinien (527-565)", "Charlemagne (empereur en 800)"],
      ["Titre du souverain", "Basileus", "Empereur"],
      ["Chef de l'Église", "Patriarche de Constantinople", "Pape, à Rome"],
      ["Langue de l'Église", "Grec", "Latin"],
    ],
  } },
  { type: "EXAMPLE", title: "Étudier un document : le couronnement de Charlemagne", notion: "L'Empire carolingien", data: {
    text: "« Le jour de la Nativité, le pape couronna Charles de ses propres mains. Tout le peuple romain s'écria : À Charles, Auguste, couronné par Dieu, grand et pacifique empereur des Romains, vie et victoire ! »\n(D'après les Annales royales franques, IXe siècle)",
    comment: "Ce texte montre que Charlemagne tient son pouvoir de Dieu, par l'intermédiaire du pape.\nLe titre « empereur des Romains » montre qu'il se présente comme l'héritier de l'Empire romain d'Occident.",
  } },
];

export const FLASHCARDS: { front: string; back: string; notion: string; legacy?: boolean; verify?: boolean }[] = [
  { front: "BASILEUS", back: "Titre de l'empereur byzantin", notion: "Vocabulaire", legacy: true },
  { front: "PAÏEN", back: "Personne croyant en plusieurs dieux", notion: "Vocabulaire", legacy: true, verify: true },
  { front: "SCHISME", back: "Séparation entre Église catholique et orthodoxe", notion: "Vocabulaire", legacy: true },
  { front: "MISSI DOMINICI", back: "Envoyés de Charlemagne", notion: "Vocabulaire", legacy: true },
  { front: "Capitale de l'Empire byzantin ?", back: "Constantinople", notion: "L'Empire byzantin" },
  { front: "Capitale de Charlemagne ?", back: "Aix-la-Chapelle", notion: "L'Empire carolingien" },
  { front: "25 décembre 800", back: "Charlemagne est couronné empereur à Rome par le pape", notion: "Repères chronologiques" },
  { front: "1054", back: "Schisme entre les chrétiens d'Orient (orthodoxes) et d'Occident (catholiques)", notion: "Repères chronologiques" },
  { front: "1453", back: "Prise de Constantinople par les Turcs ottomans : fin de l'Empire byzantin", notion: "Repères chronologiques" },
  { front: "Justinien", back: "Empereur byzantin de 527 à 565 ; il fait construire Sainte-Sophie", notion: "L'Empire byzantin" },
  { front: "PATRIARCHE", back: "Chef de l'Église d'Orient, à Constantinople", notion: "Vocabulaire" },
  { front: "COMTE", back: "Représentant de l'empereur dans un comté", notion: "Vocabulaire" },
  { front: "CAPITULAIRE", back: "Loi écrite décidée par Charlemagne", notion: "Vocabulaire" },
  { front: "ICÔNE", back: "Image religieuse peinte vénérée par les chrétiens orthodoxes", notion: "Vocabulaire" },
  { front: "843", back: "Traité de Verdun : l'empire de Charlemagne est partagé entre ses trois petits-fils", notion: "Repères chronologiques" },
];

const MAP = "/cartes/mediterranee-europe.svg";
const pt = (label: keyof typeof P, r = 5) => ({ label, x: P[label][0], y: P[label][1], r });
const CORONATION = "« Le jour de la Nativité, le pape couronna Charles de ses propres mains. Tout le peuple romain s'écria : À Charles, Auguste, couronné par Dieu, grand et pacifique empereur des Romains, vie et victoire ! »";

export type SeedQ = { step: "MEMORIZE" | "PRACTICE" | "EXAM"; type: string; prompt: string; data: any; notion: string; explanation?: string; method?: string; points?: number; group?: string; context?: any; legacy?: boolean };

export const QUESTIONS: SeedQ[] = [
  // ---------- Je mémorise ----------
  { step: "MEMORIZE", type: "SHORT_ANSWER", prompt: "Quel est le titre de l'empereur byzantin ?", data: { accepted: ["basileus"] }, notion: "Vocabulaire", explanation: "L'empereur byzantin porte le titre grec de basileus." },
  { step: "MEMORIZE", type: "MATCH", prompt: "Associe chaque mot à sa définition.", notion: "Vocabulaire", data: { pairs: [
    { left: "Basileus", right: "Empereur byzantin" }, { left: "Patriarche", right: "Chef de l'Église d'Orient" },
    { left: "Pape", right: "Chef de l'Église d'Occident" }, { left: "Missi dominici", right: "Envoyés qui contrôlent les comtes" },
  ] }, explanation: "Ces quatre mots désignent les personnes qui exercent le pouvoir politique ou religieux dans les deux empires." },
  { step: "MEMORIZE", type: "FILL_BLANK", prompt: "Complète le texte.", notion: "L'Empire carolingien", data: { text: "Charlemagne est couronné empereur à [[Rome]] par le [[pape]] le 25 décembre [[800]]. Sa capitale est [[Aix-la-Chapelle|Aix]].", wordBank: true }, explanation: "Le couronnement a lieu à Rome, mais Charlemagne gouverne depuis Aix-la-Chapelle." },
  { step: "MEMORIZE", type: "ORDER", prompt: "Remets ces événements dans l'ordre chronologique (du plus ancien au plus récent).", notion: "Repères chronologiques", data: { items: [
    "Fondation de Constantinople", "Règne de Justinien", "Couronnement de Charlemagne", "Schisme entre Orient et Occident", "Prise de Constantinople par les Turcs",
  ] }, explanation: "330 → 527-565 → 800 → 1054 → 1453.", method: "Associe toujours un événement à sa date : c'est la date qui permet de le ranger." },
  { step: "MEMORIZE", type: "SHORT_ANSWER", prompt: "En quelle année a lieu le schisme entre l'Église d'Orient et l'Église d'Occident ?", data: { accepted: ["1054"] }, notion: "Repères chronologiques", explanation: "Le schisme date de 1054." },

  // ---------- Je m'entraîne ----------
  { step: "PRACTICE", type: "MCQ", prompt: "Quelle est la capitale de l'Empire byzantin ?", data: { options: ["Rome", "Athènes", "Constantinople", "Jérusalem"], correct: [2] }, notion: "L'Empire byzantin", legacy: true,
    explanation: "Constantinople a été fondée en 330 par l'empereur Constantin, sur le site de l'ancienne ville grecque de Byzance.", method: "Byzance → byzantin : c'est l'ancienne ville qui a donné son nom à l'empire." },
  { step: "PRACTICE", type: "MCQ", prompt: "Quelle est la capitale de l'Empire carolingien ?", data: { options: ["Paris", "Aix-la-Chapelle", "Rome", "Lyon"], correct: [1] }, notion: "L'Empire carolingien", legacy: true,
    explanation: "Charlemagne réside surtout à Aix-la-Chapelle, où il fait construire son palais. Rome est la ville du pape, où il a été couronné.", method: "Ne confonds pas le lieu du couronnement (Rome) et la capitale (Aix-la-Chapelle)." },
  { step: "PRACTICE", type: "MCQ", prompt: "Qui surveille les comtes ?", data: { options: ["Le pape", "Les missi dominici", "Les évêques", "Les moines"], correct: [1] }, notion: "L'Empire carolingien", legacy: true,
    explanation: "Les missi dominici, « envoyés du maître », parcourent l'empire par deux pour contrôler les comtes au nom de Charlemagne." },
  { step: "PRACTICE", type: "MCQ", prompt: "Quel est le titre de l'empereur byzantin ?", data: { options: ["Comte", "Basileus", "Patriarche", "Auguste"], correct: [1] }, notion: "Vocabulaire", legacy: true,
    explanation: "Basileus est le titre grec de l'empereur byzantin. Le patriarche est un chef religieux, pas l'empereur." },
  { step: "PRACTICE", type: "TRUE_FALSE", prompt: "Vrai ou faux : Charlemagne a été couronné empereur à Aix-la-Chapelle.", data: { correct: false }, notion: "L'Empire carolingien",
    explanation: "Faux : il a été couronné à Rome, par le pape, le 25 décembre 800. Aix-la-Chapelle est sa capitale." },
  { step: "PRACTICE", type: "CATEGORIZE", prompt: "Classe chaque élément dans l'empire auquel il appartient.", notion: "Chrétiens d'Orient et d'Occident", data: {
    categories: ["Empire byzantin", "Empire carolingien"],
    items: [
      { text: "Constantinople", category: "Empire byzantin" }, { text: "Basileus", category: "Empire byzantin" }, { text: "Justinien", category: "Empire byzantin" },
      { text: "Sainte-Sophie", category: "Empire byzantin" }, { text: "Patriarche", category: "Empire byzantin" },
      { text: "Aix-la-Chapelle", category: "Empire carolingien" }, { text: "Missi dominici", category: "Empire carolingien" },
      { text: "Capitulaires", category: "Empire carolingien" }, { text: "Charlemagne", category: "Empire carolingien" },
    ] }, explanation: "Revois le tableau comparatif de la fiche : chaque empire a sa capitale, son souverain et son organisation.", points: 2 },
  { step: "PRACTICE", type: "TIMELINE", prompt: "Place ces événements sur la frise (à 10 ans près).", notion: "Repères chronologiques", data: {
    min: 300, max: 1500, tolerance: 10, events: [
      { label: "Fondation de Constantinople", year: 330 }, { label: "Couronnement de Charlemagne", year: 800 },
      { label: "Schisme", year: 1054 }, { label: "Prise de Constantinople par les Turcs", year: 1453 },
    ] }, explanation: "330, 800, 1054 et 1453 sont les quatre repères à connaître par cœur.", method: "Repère d'abord les siècles : 800 est au IXe siècle, 1054 au XIe siècle, 1453 au XVe siècle.", points: 2 },
  { step: "PRACTICE", type: "IMAGE_POINT", prompt: "Place Constantinople, Rome et Aix-la-Chapelle sur la carte.", notion: "Localiser sur une carte", data: { image: MAP, targets: [pt("Constantinople"), pt("Rome"), pt("Aix-la-Chapelle")] },
    explanation: "Constantinople contrôle le détroit du Bosphore, entre la mer Noire et la Méditerranée. Rome est au centre de la péninsule italienne. Aix-la-Chapelle est au nord, entre les fleuves Rhin et Meuse.", method: "Pars des repères faciles : la botte de l'Italie, puis la mer Noire.", points: 3 },
  { step: "PRACTICE", type: "MCQ", prompt: "D'après ce texte, de qui Charlemagne tient-il son pouvoir d'empereur ?", context: { text: CORONATION, source: "D'après les Annales royales franques, IXe siècle" }, notion: "L'Empire carolingien",
    data: { options: ["Du peuple romain seulement", "De Dieu, par l'intermédiaire du pape", "Du basileus", "De ses comtes"], correct: [1] },
    explanation: "Le texte dit « couronné par Dieu » et précise que c'est le pape qui pose la couronne.", method: "Pour analyser un document, relève les mots exacts du texte qui justifient ta réponse." },
  { step: "PRACTICE", type: "SHORT_ANSWER", prompt: "Comment appelle-t-on la séparation de 1054 entre les chrétiens d'Orient et d'Occident ?", data: { accepted: ["schisme", "grand schisme", "schisme de 1054"] }, notion: "Chrétiens d'Orient et d'Occident",
    explanation: "C'est le schisme : depuis 1054, on distingue l'Église orthodoxe (Orient) et l'Église catholique (Occident)." },
  { step: "PRACTICE", type: "MCQ", prompt: "Quelles affirmations concernent l'Empire byzantin ? (plusieurs réponses)", notion: "L'Empire byzantin",
    data: { options: ["Sa capitale est Constantinople", "Son Église utilise le grec", "Son empereur est couronné par le pape", "Sa capitale est Aix-la-Chapelle"], correct: [0, 1] },
    explanation: "Le basileus n'est pas couronné par le pape : c'est en Occident que le pape couronne Charlemagne.", points: 2 },
  { step: "PRACTICE", type: "OPEN", points: 3, prompt: "Explique en deux ou trois phrases comment Charlemagne gouverne son empire.", notion: "L'Empire carolingien",
    data: { criteria: [{ label: "Je cite les comtes, qui représentent l'empereur dans les comtés", points: 1 }, { label: "Je cite les missi dominici et leur rôle de contrôle", points: 1 }, { label: "Je cite les capitulaires (les lois)", points: 1 }],
      modelAnswer: "Charlemagne divise son empire en comtés, dirigés par des comtes qui le représentent. Pour vérifier qu'ils obéissent, il envoie les missi dominici les contrôler. Il fait appliquer dans tout l'empire ses lois écrites, les capitulaires." },
    explanation: "Une bonne réponse utilise le vocabulaire précis du cours.", method: "Pour rédiger : une idée par phrase, et un mot de vocabulaire du cours dans chaque phrase." },

  // ---------- Contrôle blanc (2 variantes par groupe, 20 points par copie) ----------
  { step: "EXAM", group: "A", type: "MATCH", points: 4, prompt: "Vocabulaire : associe chaque mot à sa définition.", notion: "Vocabulaire", data: { pairs: [
    { left: "Basileus", right: "Empereur byzantin" }, { left: "Patriarche", right: "Chef de l'Église d'Orient" },
    { left: "Missi dominici", right: "Envoyés qui contrôlent les comtes" }, { left: "Capitulaire", right: "Loi écrite de Charlemagne" },
  ] }, explanation: "Revois les définitions de la fiche." },
  { step: "EXAM", group: "A", type: "MATCH", points: 4, prompt: "Vocabulaire : associe chaque mot à sa définition.", notion: "Vocabulaire", data: { pairs: [
    { left: "Pape", right: "Chef de l'Église d'Occident" }, { left: "Comte", right: "Représentant de l'empereur dans un comté" },
    { left: "Schisme", right: "Séparation entre deux Églises" }, { left: "Icône", right: "Image religieuse vénérée par les orthodoxes" },
  ] }, explanation: "Revois les définitions de la fiche." },
  { step: "EXAM", group: "B", type: "ORDER", points: 4, prompt: "Chronologie : range ces événements du plus ancien au plus récent.", notion: "Repères chronologiques", data: { items: [
    "Fondation de Constantinople (330)", "Règne de Justinien (527-565)", "Couronnement de Charlemagne (800)", "Schisme (1054)",
  ] }, explanation: "Les dates sont indiquées : il suffit de les comparer." },
  { step: "EXAM", group: "B", type: "TIMELINE", points: 4, prompt: "Chronologie : place ces événements sur la frise (à 10 ans près).", notion: "Repères chronologiques", data: {
    min: 700, max: 1500, tolerance: 10, events: [
      { label: "Couronnement de Charlemagne", year: 800 }, { label: "Traité de Verdun", year: 843 }, { label: "Schisme", year: 1054 }, { label: "Prise de Constantinople par les Turcs", year: 1453 },
    ] }, explanation: "800, 843, 1054, 1453." },
  { step: "EXAM", group: "C", type: "IMAGE_POINT", points: 3, prompt: "Carte : place Constantinople, Rome et Aix-la-Chapelle.", notion: "Localiser sur une carte", data: { image: MAP, targets: [pt("Constantinople", 4), pt("Rome", 4), pt("Aix-la-Chapelle", 4)] }, explanation: "Constantinople sur le Bosphore, Rome au centre de l'Italie, Aix-la-Chapelle au nord, près du Rhin." },
  { step: "EXAM", group: "C", type: "IMAGE_POINT", points: 3, prompt: "Carte : place Constantinople, Rome et Ravenne.", notion: "Localiser sur une carte", data: { image: MAP, targets: [pt("Constantinople", 4), pt("Rome", 4), pt("Ravenne", 4)] }, explanation: "Ravenne est au nord-est de l'Italie, sur la mer Adriatique : on y voit les mosaïques de Justinien." },
  { step: "EXAM", group: "D", type: "FILL_BLANK", points: 3, prompt: "Complète le texte.", notion: "L'Empire carolingien", data: { text: "Le 25 décembre [[800]], Charlemagne est couronné empereur à [[Rome]] par le [[pape]].", wordBank: false }, explanation: "Rome, le pape, 800." },
  { step: "EXAM", group: "D", type: "FILL_BLANK", points: 3, prompt: "Complète le texte.", notion: "Chrétiens d'Orient et d'Occident", data: { text: "En [[1054]], le [[schisme]] sépare les chrétiens d'Orient, les [[orthodoxes]], et les chrétiens d'Occident, les [[catholiques]].", wordBank: false }, explanation: "1054, schisme, orthodoxes, catholiques." },
  { step: "EXAM", group: "E", type: "TRUE_FALSE", points: 2, prompt: "Vrai ou faux : le basileus dirige l'État et protège l'Église.", notion: "L'Empire byzantin", data: { correct: true }, explanation: "Vrai : l'empereur byzantin a un pouvoir politique et religieux." },
  { step: "EXAM", group: "E", type: "TRUE_FALSE", points: 2, prompt: "Vrai ou faux : les missi dominici sont les chefs de l'Église d'Orient.", notion: "L'Empire carolingien", data: { correct: false }, explanation: "Faux : ce sont les envoyés de Charlemagne. Le chef de l'Église d'Orient est le patriarche." },
  { step: "EXAM", group: "F", type: "OPEN", points: 4, prompt: "Rédaction (3 à 5 lignes) : montre que Charlemagne gouverne un empire chrétien et bien organisé.", notion: "L'Empire carolingien", data: {
    criteria: [{ label: "Le couronnement par le pape à Rome en 800", points: 1 }, { label: "Les comtes qui représentent l'empereur", points: 1 }, { label: "Les missi dominici qui contrôlent les comtes", points: 1 }, { label: "Des phrases complètes avec le vocabulaire du cours", points: 1 }],
    modelAnswer: "Charlemagne est couronné empereur par le pape à Rome le 25 décembre 800 : il tient son pouvoir de Dieu et protège l'Église. Il divise son empire en comtés dirigés par des comtes. Les missi dominici contrôlent ces comtes, et les capitulaires fixent les lois dans tout l'empire.",
  }, explanation: "Une réponse rédigée est corrigée par ton professeur selon les critères." },
  { step: "EXAM", group: "F", type: "OPEN", points: 4, prompt: "Rédaction (3 à 5 lignes) : présente l'Empire byzantin (capitale, empereur, religion).", notion: "L'Empire byzantin", data: {
    criteria: [{ label: "La capitale Constantinople", points: 1 }, { label: "Le basileus, qui dirige l'État et protège l'Église", points: 1 }, { label: "Les chrétiens d'Orient (orthodoxes) et le patriarche", points: 1 }, { label: "Des phrases complètes avec le vocabulaire du cours", points: 1 }],
    modelAnswer: "L'Empire byzantin a pour capitale Constantinople. Il est dirigé par le basileus, qui gouverne l'État et protège l'Église. Les Byzantins sont des chrétiens d'Orient : leur Église, dirigée par le patriarche de Constantinople, devient orthodoxe après le schisme de 1054.",
  }, explanation: "Une réponse rédigée est corrigée par ton professeur selon les critères." },
];

export { REF, LEGACY };
