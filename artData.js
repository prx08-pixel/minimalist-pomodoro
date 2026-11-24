// Database of underrepresented ancient and cultural historical masterpieces.
// imagePath is a direct remote image URL. Unsplash crop params keep the mosaic sharp.
const IMAGE_PARAMS = "?auto=format&fit=crop&w=1920&q=80";

const CULTURAL_ART_COLLECTION = [
  {
    id: 1,
    title: "The Great Stupa at Sanchi (Torana Carvings)",
    culture: "Ancient Indian (Satavahana Dynasty)",
    era: "1st Century BCE",
    origin: "Madhya Pradesh, India",
    imagePath: `https://images.unsplash.com/photo-1548013146-72479768bada${IMAGE_PARAMS}`,
    description:
      "Intricate stone narrative reliefs detailing the Jataka tales and life of the Buddha. These gateways represent a pinnacle of early Indian structural and sculptural narrative tradition, celebrating communal harmony and spiritual devotion.",
  },
  {
    id: 2,
    title: "The Olmec Colossal Heads",
    culture: "Pre-Columbian Mesoamerican (Olmec)",
    era: "900 BCE",
    origin: "San Lorenzo & La Venta, Gulf Coast of Mexico",
    imagePath: `https://images.unsplash.com/photo-1518636637890-2bec1698c4b3${IMAGE_PARAMS}`,
    description:
      "Carved from single basalt boulders transported over immense distances, these monumental sculptures represent powerful Olmec rulers. They exhibit distinct individual expressions, realistic facial features, and stylized headgear unique to early Mesoamerican civilizations.",
  },
  {
    id: 3,
    title: "The Terracotta Wall Plaques of Benin",
    culture: "Edo Culture (Kingdom of Benin)",
    era: "16th - 17th Century CE",
    origin: "Modern-day Nigeria, West Africa",
    imagePath: `https://images.unsplash.com/photo-1577083552431-6e5fd01988ec${IMAGE_PARAMS}`,
    description:
      "Exquisite cast brass and bronze relief plaques that originally adorned the wooden pillars of the royal palace. They depict historical court life, military victories, and complex diplomatic relationships, showcasing unparalleled metallurgy Mastery.",
  },
  {
    id: 4,
    title: "The Ishtar Gate Bas-Reliefs",
    culture: "Neo-Babylonian Empire",
    era: "Circa 575 BCE",
    origin: "Babylon, Modern-day Iraq",
    imagePath: `https://images.unsplash.com/photo-1578662996442-48f60103fc96${IMAGE_PARAMS}`,
    description:
      "Constructed of vibrant blue glazed bricks, the gate featured alternating rows of bas-relief dragons (sirrush) and bulls. The technique of glazing molded bricks created a magnificent, shimmering civic landscape celebrating protective deities.",
  },
  {
    id: 5,
    title: "The Tomb of the Diver Fresco",
    culture: "Magna Graecia (Lucanian/Greek)",
    era: "Circa 470 BCE",
    origin: "Paestum, Southern Italy",
    imagePath: `https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5${IMAGE_PARAMS}`,
    description:
      "The only fully intact example of Greek wall painting with figured scenes from the Classical era. The ceiling slab depicts a lone youth diving into a pool of water, serving as a powerful, minimalist philosophical metaphor for the transition from life into death.",
  },
  {
    id: 6,
    title: "Ancestral Moai Monoliths",
    culture: "Rapa Nui (Polynesian)",
    era: "1250 - 1500 CE",
    origin: "Easter Island, Polynesia",
    imagePath: `https://images.unsplash.com/photo-1561896931-7255924c17e0${IMAGE_PARAMS}`,
    description:
      "Carved from compressed volcanic ash, these monumental minimalist figures represent deified ancestors. They were positioned facing inland toward villages to watch over the community, projecting living mana (spiritual power) and societal protection.",
  },
  {
    id: 7,
    title: "The Codex Zouche-Nuttall",
    culture: "Mixtec (Pre-Columbian)",
    era: "14th Century CE",
    origin: "Oaxaca, Mexico",
    imagePath: `https://images.unsplash.com/photo-1541961017774-22349e4a1262${IMAGE_PARAMS}`,
    description:
      "An accordion-folded deer-skin manuscript painted with vibrant natural pigments. It uses complex, stylized pictographic scripts to document centuries of royal Mixtec lineages, alliances, and historic military achievements.",
  },
  {
    id: 8,
    title: "Dunhuang Mogao Cave Frescoes",
    culture: "Tang Dynasty Buddhist Art",
    era: "8th Century CE",
    origin: "Gansu Province, China",
    imagePath: `https://images.unsplash.com/photo-1547981609-4b2f99e19880${IMAGE_PARAMS}`,
    description:
      "Vibrant wall paintings along the Silk Road depicting flying apsaras (celestial beings) and intricate spiritual mandalas. This cross-cultural art hub fused Indian, Persian, and Chinese aesthetics, creating a breathtaking visual legacy of ancient trade and faith.",
  },
  {
    id: 9,
    title: "Chola Dynasty Bronzes (Nataraja Shiva)",
    culture: "Medieval South Indian (Chola Empire)",
    era: "10th - 11th Century CE",
    origin: "Tamil Nadu, India",
    imagePath: `https://images.unsplash.com/photo-1524492412937-b28074a5d7da${IMAGE_PARAMS}`,
    description:
      "A supreme triumph of lost-wax bronze casting. It depicts Shiva dancing the cosmic cycle of creation and destruction within a ring of fire, balancing fierce movement with complete serene introspection.",
  },
  {
    id: 10,
    title: "The Nok Terracotta Sculptures",
    culture: "Nok Culture",
    era: "500 BCE - 200 CE",
    origin: "Jos Plateau, Nigeria, West Africa",
    imagePath: `https://images.unsplash.com/photo-1610701596007-11502861dcfa${IMAGE_PARAMS}`,
    description:
      "Among the earliest known figurative sculptures in Sub-Saharan Africa. Characterized by elongated heads, highly stylized triangular eyes, and geometric hair patterns, indicating a complex, advanced ancient iron-age civilization.",
  },
  {
    id: 11,
    title: "Mimbres Pottery Geometric Bowls",
    culture: "Indigenous Mogollon (Mimbres Branch)",
    era: "1000 - 1130 CE",
    origin: "American Southwest (New Mexico/Arizona)",
    imagePath: `https://images.unsplash.com/photo-1578749556568-bc2c2692c22e${IMAGE_PARAMS}`,
    description:
      "Finely painted black-on-white earthenware showcasing stunningly sophisticated geometric abstractions and stylized animal spirits. These bowls were ritually perforated ('killed') and placed in burial sites to release the vessel's spirit.",
  },
  {
    id: 12,
    title: "The Lycurgus Cup Dichroic Glass",
    culture: "Late Roman / Early Byzantine",
    era: "4th Century CE",
    origin: "Alexandria or Rome",
    imagePath: `https://images.unsplash.com/photo-1554907984-152746b7ca57${IMAGE_PARAMS}`,
    description:
      "An extraordinary example of ancient nanotechnology. The glass container contains silver and gold nanoparticles, causing it to magically shift color from jade green when lit from the front to deep blood red when lit from within.",
  },
  {
    id: 13,
    title: "Bradshaw / Gwion Gwion Rock Paintings",
    culture: "Indigenous Australian Aboriginal",
    era: "Circa 12,000 BCE (or older)",
    origin: "Kimberley Region, Western Australia",
    imagePath: `https://images.unsplash.com/photo-1518709268805-4e9042af9f23${IMAGE_PARAMS}`,
    description:
      "Incredibly ancient, highly detailed filament-like figures painted with iron oxide. They depict human forms adorned with complex tassels, armlets, large headdresses, and boomerangs, offering a rare look at prehistoric ceremonial attire.",
  },
  {
    id: 14,
    title: "San Rock Art Murals",
    culture: "San Peoples (Bushmen)",
    era: "Estimated 2,000 BCE - 100 CE",
    origin: "Drakensberg Mountains, South Africa",
    imagePath: `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b${IMAGE_PARAMS}`,
    description:
      "Rich polychrome sandstone paintings illustrating the complex spiritual cosmos of the San. The depictions of eland antelopes and therianthropes (human-animal hybrids) represent shamans capturing healing energy during trance dances.",
  },
  {
    id: 15,
    title: "Zapotec Funerary Urns",
    culture: "Pre-Columbian Zapotec",
    era: "200 - 700 CE",
    origin: "Monte Albán, Oaxaca, Mexico",
    imagePath: `https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b${IMAGE_PARAMS}`,
    description:
      "Intricately modeled ceramic vessels representing gods or deified ancestors clad in elaborate regalia, large animal glyph masks, and heavy feathers. They were placed in royal tombs to protect the souls entering the underworld.",
  },
  {
    id: 16,
    title: "Lapis Lazuli Inlays of Ur",
    culture: "Ancient Sumerian civilization",
    era: "Circa 2500 BCE",
    origin: "Royal Tombs of Ur, Mesopotamia (Modern Iraq)",
    imagePath: `https://images.unsplash.com/photo-1610375461246-83df3f9f1d80${IMAGE_PARAMS}`,
    description:
      "Exquisite visual narratives crafted by inlaying shell, red limestone, and rich blue lapis lazuli into wooden boxes and instruments. They document early complex societies, tracking scenes of peaceful banquets on one side and military parades on the other.",
  },
  {
    id: 17,
    title: "The Standing Buddha of Gandhara",
    culture: "Greco-Buddhist Art (Kushan Empire)",
    era: "2nd - 3rd Century CE",
    origin: "Ancient Gandhara (Modern Pakistan/Afghanistan)",
    imagePath: `https://images.unsplash.com/photo-1508062878650-88b375432c38${IMAGE_PARAMS}`,
    description:
      "A profound aesthetic fusion blending Greek Hellenistic drapery folds, realism, and facial anatomy with classical Indian Buddhist iconography, representing the early physical personification of the enlightened one.",
  },
  {
    id: 18,
    title: "Nazca Lines Geoglyphs",
    culture: "Pre-Columbian Nazca Culture",
    era: "200 BCE - 500 CE",
    origin: "Nazca Desert, Peru",
    imagePath: `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800${IMAGE_PARAMS}`,
    description:
      "Monumental lines and biomorphic representations scratched directly into the iron-oxide coated desert floor. Spanning kilometers, these geometric figures served astronomical mapping cycles and sacred water processions.",
  },
  {
    id: 19,
    title: "Cycladic Marble Idols",
    culture: "Early Bronze Age Cycladic Culture",
    era: "Circa 2800 - 2300 BCE",
    origin: "Cyclades Islands, Aegean Sea, Greece",
    imagePath: `https://images.unsplash.com/photo-1526392060635-9d6019884377${IMAGE_PARAMS}`,
    description:
      "Ultra-minimalist, geometric marble figurines featuring flat wedge faces, folded arms, and sharp clean profiles. Their striking modern aesthetic influenced 20th-century sculptors despite being created nearly 5,000 years ago.",
  },
  {
    id: 20,
    title: "The Lyre of Queen Puabi",
    culture: "Early Dynastic Sumerian",
    era: "Circa 2600 BCE",
    origin: "Royal Cemetery of Ur, Iraq",
    imagePath: `https://images.unsplash.com/photo-1475721027785-f74eccf877e2${IMAGE_PARAMS}`,
    description:
      "A stringed instrument featuring a golden bull's head with a lapis lazuli beard and inlaid front plaque panels showing mythical animals acting out human court roles, illustrating ancient epic performance folklore.",
  },
  {
    id: 21,
    title: "The Great Serpent Mound",
    culture: "Indigenous American (Adena or Fort Ancient)",
    era: "Estimated 300 BCE - 1000 CE",
    origin: "Ohio, United States",
    imagePath: `https://images.unsplash.com/photo-1500382017463-52bd5c16532c${IMAGE_PARAMS}`,
    description:
      "The world's largest prehistoric effigy earthwork mound, stretching over 1,300 feet. It winds gracefully like an uncoiling snake, with its head aligned perfectly to the summer solstice sunset, representing complex ancient astronomy.",
  },
  {
    id: 22,
    title: "Dunhuang Mogao Cave 45 Sculptures",
    culture: "High Tang Dynasty Buddhism",
    era: "8th Century CE",
    origin: "Gansu Province, China",
    imagePath: `https://images.unsplash.com/photo-1528164344705-14241c141d22${IMAGE_PARAMS}`,
    description:
      "Masterful painted stucco statues depicting the Buddha flanked by disciples, bodhisattvas, and heavenly guardians. The realistic body weight, graceful curves, and natural expressions mark a creative peak along the Silk Road.",
  },
  {
    id: 23,
    title: "Kimerle Polynesian Tapa Cloth",
    culture: "Polynesian Oceanic Culture",
    era: "Traditional Historic Form",
    origin: "Samoa / Tonga / Fiji Islands",
    imagePath: `https://images.unsplash.com/photo-1528459801416-a9e53fa8b24d${IMAGE_PARAMS}`,
    description:
      "Sacred textiles beaten from inner mulberry tree bark and hand-painted using natural vegetable dyes and geometric pattern rubbing stencils. Used for major structural lifecycles, alliances, and protective social status wrappers.",
  },
  {
    id: 24,
    title: "Elamite Bronze and Gold Statue of Napirasu",
    culture: "Middle Elamite Period",
    era: "Circa 1300 BCE",
    origin: "Susa, Southwestern Iran",
    imagePath: `https://images.unsplash.com/photo-1564501049412-61c2a3083791${IMAGE_PARAMS}`,
    description:
      "A monumental solid bronze casing weighing over 3,800 pounds, capturing Queen Napirasu in formal royal robes. The intricate geometric engraving across her dress panels mimics advanced weaving textures from early Near East courts.",
  },
  {
    id: 25,
    title: "Scythian Golden Stag Plaques",
    culture: "Nomadic Scythian Tribes",
    era: "6th Century BCE",
    origin: "Kostromskaya, Black Sea Steppes",
    imagePath: `https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6${IMAGE_PARAMS}`,
    description:
      "A breathtaking golden shield ornament executed in the iconic Steppes animal style. The stag is captured at full speed with its antlers stylized into a continuous, flowing wave of geometric hooks, capturing raw movement.",
  },
];

function getRandomArtwork() {
  const randomIndex = Math.floor(Math.random() * CULTURAL_ART_COLLECTION.length);
  return CULTURAL_ART_COLLECTION[randomIndex];
}

export { CULTURAL_ART_COLLECTION, getRandomArtwork };
