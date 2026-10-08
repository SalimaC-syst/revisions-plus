// Génère les cartes muettes intégrées (données Natural Earth, domaine public)
// et calcule la position de lieux en pourcentage de l'image.
import fs from "node:fs";
import { feature } from "topojson-client";
import { geoConicConformal, geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../node_modules/world-atlas/${f}`, import.meta.url)));
const land50 = feature(read("land-50m.json"), read("land-50m.json").objects.land);
const land110 = feature(read("land-110m.json"), read("land-110m.json").objects.land);
const countries50 = read("countries-50m.json");
const borders = feature(countries50, countries50.objects.countries);

function svg({ w, h, projection, land, extra = "", grat = true }) {
  const path = geoPath(projection).digits(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<rect width="${w}" height="${h}" fill="#cfe3f3"/>
${grat ? `<path d="${path(geoGraticule10())}" fill="none" stroke="#b5cfe4" stroke-width="0.6"/>` : ""}
<path d="${path(land)}" fill="#f4ecd8" stroke="#8f8466" stroke-width="0.8"/>
${extra}
</svg>`;
}

// Europe et Méditerranée
const W = 900, H = 640;
const bbox = { type: "Feature", geometry: { type: "Polygon", coordinates: [[[-11, 28], [-11, 58], [46, 58], [46, 28], [-11, 28]]] } };
const med = geoConicConformal().rotate([-15, 0]).parallels([35, 55]).fitExtent([[0, 0], [W, H]], bbox).clipExtent([[0, 0], [W, H]]);
fs.writeFileSync("public/cartes/mediterranee-europe.svg", svg({ w: W, h: H, projection: med, land: land50 }));

const places = {
  Constantinople: [28.98, 41.01], Rome: [12.5, 41.9], "Aix-la-Chapelle": [6.08, 50.78], Ravenne: [12.2, 44.42],
  Jérusalem: [35.21, 31.77], Athènes: [23.73, 37.98], Paris: [2.35, 48.86], Alexandrie: [29.92, 31.2], Carthage: [10.32, 36.85],
};
const pct = Object.fromEntries(Object.entries(places).map(([k, c]) => { const [x, y] = med(c); return [k, [Math.round((x / W) * 1000) / 10, Math.round((y / H) * 1000) / 10]]; }));
fs.writeFileSync("scripts/map-places.json", JSON.stringify(pct, null, 2));

// Planisphère
const world = geoNaturalEarth1().fitExtent([[4, 4], [996, 516]], { type: "Sphere" });
fs.writeFileSync("public/cartes/monde.svg", svg({ w: 1000, h: 520, projection: world, land: land110 }));

// France métropolitaine
const frBox = { type: "Feature", geometry: { type: "Polygon", coordinates: [[[-5.5, 41.2], [-5.5, 51.3], [9.8, 51.3], [9.8, 41.2], [-5.5, 41.2]]] } };
const fr = geoConicConformal().rotate([-3, 0]).parallels([44, 49]).fitExtent([[10, 10], [690, 690]], frBox).clipExtent([[0, 0], [700, 700]]);
const frPath = geoPath(fr).digits(1);
const france = borders.features.find((f) => f.id === "250");
fs.writeFileSync("public/cartes/france.svg", svg({ w: 700, h: 700, projection: fr, land: land50, grat: false, extra: `<path d="${frPath(france)}" fill="#fff6dd" stroke="#6b5f3f" stroke-width="1.2"/>` }));
console.log(pct);
