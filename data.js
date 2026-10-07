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
    fullText: `Homem pré-histórico conhecido como "flautista". Homem com cerca de 45 anos que viveu há 2.000 anos antes do presente no Agreste de Pernambuco. Enterrado com ele, a flauta feita de um osso de perna humana. A face foi reconstruída em 3D. O sepultamento é de origem do sítio`,
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
    fullText: `Osso do tornozelo (astrágalo), impresso em 3D, de um cavalo (Hippidion principale), que viveu durante o período do Quaternário (0,8-0,012 Ma.) em Pernambuco.`,
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
    fullText: `Os peixes-bois pertencem a ordem chamada de Sirenia, contendo duas espécies no Brasil: o peixe-boi marinho (Trichechus manatus), que ocorre desde o nordeste do Brasil até a América Central (com pontos de descontinuidade em toda a área).

São animais herbívoros, se alimentando de algas, capim agulha e folhas do mangue, porém podem se alimentar de invertebrados ocasionalmente ou acidentalmente.`,
    facts: [
      { label: "Ordem", value: "Sirenia" },
      { label: "Espécie marinha", value: "Trichechus manatus" },
      { label: "Dieta", value: "Herbívoro (algas, capim-agulha, mangue)" },
      { label: "Distribuição", value: "Nordeste do Brasil à América Central" }
    ]
  }
};
