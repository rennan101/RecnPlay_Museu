/**
 * Base de Dados das Peças Expostas no Museu
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
    shortDescription: "Reconstrução 3D facial e sepultamento com flauta óssea.",
    fullText: `Homem pré-histórico conhecido como "flautista". Homem com cerca de 45 anos que viveu há 2.000 anos antes do presente no Agreste de Pernambuco. Enterrado com ele, a flauta feita de um osso de perna humana. A face foi reconstruída em 3D. O sepultamento é de origem do sítio`,
    audioText: "Flautista. Homem pré-histórico com cerca de 45 anos que viveu há 2.000 anos antes do presente no Agreste de Pernambuco. Foi sepultado com uma flauta feita de um osso de perna humana. A sua face foi reconstruída digitalmente em 3D.",
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
    shortDescription: "Osso do tornozelo (astrágalo) impresso em 3D.",
    fullText: `Osso do tornozelo (astrágalo), impresso em 3D, de um cavalo (Hippidion principale), que viveu durante o período do Quaternário (0,8-0,012 Ma.) em Pernambuco.`,
    audioText: "Hippidion. Osso do tornozelo, chamado astrágalo, impresso em 3D, de um cavalo pré-histórico da espécie Hippidion principale, que viveu durante o período do Quaternário, entre 800 mil e 12 mil anos atrás, em Pernambuco.",
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
    shortDescription: "Mamífero aquático herbívoro do litoral nordestino.",
    fullText: `Os peixes-bois pertencem a ordem chamada de Sirenia, contendo duas espécies no Brasil: o peixe-boi marinho (Trichechus manatus), que ocorre desde o nordeste do Brasil até a América Central (com pontos de descontinuidade em toda a área).

São animais herbívoros, se alimentando de algas, capim agulha e folhas do mangue, porém podem se alimentar de invertebrados ocasionalmente ou acidentalmente.`,
    audioText: "Peixe-boi. Os peixes-bois pertencem à ordem Sirenia. No Brasil ocorrem duas espécies, destacando-se o peixe-boi marinho, Trichechus manatus. São mamíferos herbívoros que se alimentam de algas, capim-agulha e folhas de manguezal.",
    facts: [
      { label: "Ordem", value: "Sirenia" },
      { label: "Espécie marinha", value: "Trichechus manatus" },
      { label: "Dieta", value: "Herbívoro (algas, capim-agulha, mangue)" },
      { label: "Distribuição", value: "Nordeste do Brasil à América Central" }
    ]
  }
};
