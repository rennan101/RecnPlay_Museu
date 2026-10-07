/**
 * Base de Dados das Peças Expostas no Museu - MUSARQ AR
 */
const MUSEUM_ITEMS = {
  flautista: {
    id: "flautista",
    title: "Flautista",
    subtitle: "Homem pré-histórico (2.000 anos AP)",
    origin: "Agreste de Pernambuco",
    category: "Arqueologia",
    badgeColor: "#d97706",
    icon: "skull",
    audioUrl: "assets/audio/flautista.mp3",
    shortDescription: "Reconstrução 3D facial e sepultamento com flauta óssea.",
    fullText: `Olha que fascinante! Você está diante do "Flautista", um dos achados arqueológicos mais incríveis de Pernambuco! Há 2.000 anos, esse homem viveu no Agreste e foi sepultado com uma flauta esculpida em um osso de perna humana. A face dele foi reconstruída fielmente em 3D a partir do crânio original!`,
    facts: [
      { label: "Idade estimada", value: "~45 anos" },
      { label: "Período", value: "2.000 anos antes do presente" },
      { label: "Localização", value: "Agreste de Pernambuco" },
      { label: "Artefato associado", value: "Flauta feita de osso humano" }
    ]
  },
  hippidion: {
    id: "hippidion",
    title: "Hippidion",
    subtitle: "Cavalo Pré-Histórico da Megafauna",
    origin: "Pernambuco, Brasil",
    category: "Paleontologia",
    badgeColor: "#059669",
    icon: "bone",
    audioUrl: "assets/audio/hippidion.mp3",
    shortDescription: "Osso do tornozelo (astrágalo) impresso em 3D.",
    fullText: `Incrível! Esse é o astrágalo, o osso do tornozelo do lendário Hippidion principale! Um cavalo pré-histórico gigante da nossa megafauna que viveu aqui mesmo em Pernambuco há milhares de anos! Esta réplica 3D perfeita permite você segurar um pedaço vivo da pré-história nas suas mãos!`,
    facts: [
      { label: "Espécie", value: "Hippidion principale" },
      { label: "Elemento ósseo", value: "Astrágalo (Tornozelo)" },
      { label: "Período", value: "Quaternário (0,8 - 0,012 Ma.)" },
      { label: "Região", value: "Pernambuco" }
    ]
  },
  peixeboi: {
    id: "peixeboi",
    title: "Peixe-boi",
    subtitle: "Sirenia (Trichechus manatus)",
    origin: "Nordeste do Brasil à América Central",
    category: "Zoologia & Paleontologia",
    badgeColor: "#0284c7",
    icon: "water",
    audioUrl: "assets/audio/peixeboi.mp3",
    shortDescription: "Mamífero aquático herbívoro do litoral nordestino.",
    fullText: `Que descoberta espetacular! O peixe-boi marinho é um dos mamíferos aquáticos mais dóceis e fascinantes do Brasil! Esses gigantes gentis nadam desde o litoral nordestino até a América Central, se alimentando de algas e mangues. Veja como a anatomia óssea dele é adaptada perfeitamente para deslizar nas águas!`,
    facts: [
      { label: "Ordem", value: "Sirenia" },
      { label: "Espécie marinha", value: "Trichechus manatus" },
      { label: "Dieta", value: "Herbívoro (algas, capim-agulha, mangue)" },
      { label: "Distribuição", value: "Nordeste do Brasil à América Central" }
    ]
  }
};
