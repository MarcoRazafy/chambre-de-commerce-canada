import type { Space, User } from "../../lib/types";

export const USERS: Record<Space, User> = {
  public: {
    id: "u-visiteur",
    role: "visiteur",
    niveauEquipe: null,
    space: "public",
    memberId: "m10",
    nom: "Hasina Rakotoarisoa",
    fonction: "Gérante · Zafy Design",
    email: "hasina@zafydesign.mg",
    tel: "+261 34 77 889 90",
    initiales: "HR",
    photo:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
  },

  membre: {
    id: "u-membre",
    role: "membre",
    niveauEquipe: null,
    space: "membre",
    memberId: "m1",
    nom: "Voninkazo Andriamampianina",
    fonction: "Directrice Générale",
    email: "membre@gmail.com",
    tel: "+261 34 12 345 67",
    initiales: "VA",
    photo:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
  },

  admin: {
    id: "u-admin",
    role: "admin",
    niveauEquipe: "administrateur",
    space: "admin",
    memberId: null,
    nom: "Ando Ratovomanana",
    fonction: "Direction exécutive",
    email: "admin@gmail.com",
    tel: "+261 32 00 112 23",
    initiales: "AR",
    photo:
      "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
  },
};

export function getCurrentUser(space: Space): User {
  return USERS[space];
}

export const CONTACTS: {
  id: string;
  memberId: string;
  nom: string;
  fonction: string;
  email: string;
  tel: string | null;
  photo: string | null;
  principal: boolean;
}[] = [
  {
    id: "u-m1-export",
    memberId: "m1",
    nom: "Tahiry Rakotomalala",
    fonction: "Responsable export",
    email: "export@biosudessences.mg",
    tel: "+261 34 12 345 68",
    photo:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: false,
  },
  {
    id: "u-m1-qualite",
    memberId: "m1",
    nom: "Noro Rasoanaivo",
    fonction: "Qualité & certification",
    email: "qualite@biosudessences.mg",
    tel: "+261 32 44 556 67",
    photo:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: false,
  },
  {
    id: "u-m2-1",
    memberId: "m2",
    nom: "Haja Rakotondrazaka",
    fonction: "Gérant de la coopérative",
    email: "haja@highlands-artisanat.mg",
    tel: "+261 34 22 114 05",
    photo:
      "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: true,
  },
  {
    id: "u-m2-2",
    memberId: "m2",
    nom: "Fara Ramanantsoa",
    fonction: "Responsable production",
    email: "production@highlands-artisanat.mg",
    tel: "+261 33 05 887 21",
    photo:
      "https://images.unsplash.com/photo-1595152452543-e5fc28ebc2b8?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: false,
  },
  {
    id: "u-m2-export",
    memberId: "m2",
    nom: "Fanomezantsoa Randria",
    fonction: "Responsable Export",
    email: "export@highlands-artisanat.mg",
    tel: "+261 34 58 201 46",
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: false,
  },
  {
    id: "u-m3-3",
    memberId: "m3",
    nom: "Lova Andrianjafy",
    fonction: "Directeur général",
    email: "lova@tsaravoyages.mg",
    tel: "+261 32 11 447 80",
    photo:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: true,
  },
  {
    id: "u-m3-4",
    memberId: "m3",
    nom: "Miora Rabeson",
    fonction: "Chargée de clientèle",
    email: "reservations@tsaravoyages.mg",
    tel: "+261 34 66 220 13",
    photo:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: false,
  },
  {
    id: "u-m4-5",
    memberId: "m4",
    nom: "Tojo Randrianarisoa",
    fonction: "Directeur des opérations",
    email: "tojo@sahanala-agro.mg",
    tel: "+261 34 87 553 02",
    photo:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: true,
  },
  {
    id: "u-m5-6",
    memberId: "m5",
    nom: "Ny Aina Rakotobe",
    fonction: "Directeur technique",
    email: "nyaina@madatech-solutions.mg",
    tel: "+261 32 90 116 44",
    photo:
      "https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: true,
  },
  {
    id: "u-m5-7",
    memberId: "m5",
    nom: "Soa Ravelojaona",
    fonction: "Responsable comptes clients",
    email: "comptes@madatech-solutions.mg",
    tel: "+261 33 74 902 58",
    photo:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: false,
  },
  {
    id: "u-m6-8",
    memberId: "m6",
    nom: "Jean-Luc Andriatsimba",
    fonction: "Directeur d’exploitation",
    email: "jl.andriatsimba@terresrouges.mg",
    tel: "+261 34 40 337 19",
    photo:
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: true,
  },
  {
    id: "u-m7-9",
    memberId: "m7",
    nom: "Fetra Rakotoarivelo",
    fonction: "Directrice générale",
    email: "fetra@fandresena-finance.mg",
    tel: "+261 32 55 008 77",
    photo:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: true,
  },
  {
    id: "u-m7-10",
    memberId: "m7",
    nom: "Andry Rasolofo",
    fonction: "Analyste crédit PME",
    email: "credit@fandresena-finance.mg",
    tel: "+261 34 19 664 30",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: false,
  },
  {
    id: "u-m8-11",
    memberId: "m8",
    nom: "Vola Raharimanana",
    fonction: "Directrice pédagogique",
    email: "vola@institutvola.mg",
    tel: "+261 33 28 771 96",
    photo:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: true,
  },
  {
    id: "u-m9-12",
    memberId: "m9",
    nom: "Mialy Razanadrakoto",
    fonction: "Consultante indépendante",
    email: "mialy@razanadrakoto-conseil.mg",
    tel: "+261 34 03 445 62",
    photo:
      "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    principal: true,
  },
];

// Équipe de démonstration : comptes du back-office en plus de u-admin (onglet « Équipe & accès »)
export const EQUIPE: {
  id: string;
  niveau: "administrateur" | "manager";
  nom: string;
  fonction: string;
  email: string;
  tel: string | null;
  photo: string | null;
  jamaisConnecte?: boolean;
}[] = [
  {
    id: "u-equipe-direction",
    niveau: "administrateur",
    nom: "Fanja Rabemananjara",
    fonction: "Directrice adjointe",
    email: "fanja.rabemananjara@cancham.mg",
    tel: "+261 32 05 448 12",
    photo:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
  },
  {
    id: "u-equipe-adhesions",
    niveau: "manager",
    nom: "Mialy Randriamanantena",
    fonction: "Chargée des adhésions",
    email: "mialy.randriamanantena@cancham.mg",
    tel: "+261 34 22 190 45",
    photo:
      "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
  },
  {
    id: "u-equipe-evenements",
    niveau: "manager",
    nom: "Haja Rakotondrabe",
    fonction: "Responsable événements",
    email: "haja.rakotondrabe@cancham.mg",
    tel: "+261 33 11 760 08",
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
  },
  {
    id: "u-equipe-communication",
    niveau: "manager",
    nom: "Sitraka Andrianjafy",
    fonction: "Communication & newsletter",
    email: "sitraka.andrianjafy@cancham.mg",
    tel: null,
    photo: null,
    jamaisConnecte: true,
  },
  {
    id: "u-equipe-comptabilite",
    niveau: "administrateur",
    nom: "Lova Ramaroson",
    fonction: "Comptabilité & facturation",
    email: "lova.ramaroson@cancham.mg",
    tel: "+261 34 40 305 77",
    photo:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
  },
];
