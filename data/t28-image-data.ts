/**
 * Datos extraídos de las imágenes oficiales del Torneo 28
 * Fuente: t1.jpeg hasta t11.jpeg
 */

export interface ImagePlayerResult {
  position: number;
  player: string;
  points: number;
}

export interface ImageAccumulatedResult {
  position: number;
  player: string;
  fecha1?: number;
  fecha2?: number;
  fecha3?: number;
  fecha4?: number;
  fecha5?: number;
  fecha6?: number;
  fecha7?: number;
  fecha8?: number;
  fecha9?: number;
  fecha10?: number;
  fecha11?: number;
  total: number;
}

export const T28_IMAGE_DATA = {
  // Fecha 1 - Eliminaciones oficiales (eliminaciones.png posiciones 6-18)
  fecha1_eliminaciones_oficiales: [
    // De eliminaciones.png - orden cronológico de eliminaciones
    { position: 18, eliminatedPlayer: "coque", eliminatorPlayer: "freddy", time: "21:18" },
    { position: 17, eliminatedPlayer: "apolinar", eliminatorPlayer: "freddy", time: "21:42" },
    { position: 16, eliminatedPlayer: "diego", eliminatorPlayer: "freddy", time: "21:44" },
    { position: 15, eliminatedPlayer: "jorge", eliminatorPlayer: "roddy", time: "22:02" },
    { position: 14, eliminatedPlayer: "jac", eliminatorPlayer: "mono", time: "22:10" },
    { position: 13, eliminatedPlayer: "carlos", eliminatorPlayer: "ruben", time: "22:22" },
    { position: 12, eliminatedPlayer: "damian", eliminatorPlayer: "mono", time: "22:29" },
    { position: 11, eliminatedPlayer: "juan g", eliminatorPlayer: "freddy", time: "22:48" },
    { position: 10, eliminatedPlayer: "mono", eliminatorPlayer: "pit", time: "22:59" },
    { position: 9, eliminatedPlayer: "jfo", eliminatorPlayer: "roddy", time: "23:21" },
    { position: 8, eliminatedPlayer: "perro", eliminatorPlayer: "freddy", time: "23:23" },
    { position: 7, eliminatedPlayer: "ruben", eliminatorPlayer: "vela", time: "23:36" },
    { position: 6, eliminatedPlayer: "sean", eliminatorPlayer: "pit", time: "23:52" }
  ] as Array<{position: number, eliminatedPlayer: string, eliminatorPlayer: string, time: string}>,

  // Fecha 1 - Resultados individuales (t1.jpeg)
  fecha1_individual: [
    { position: 1, player: "Roddy N.", points: 26 },
    { position: 2, player: "Freddy L.", points: 23 },
    { position: 3, player: "Fernando P.", points: 20 },
    { position: 4, player: "Daniel V.", points: 17 },
    { position: 5, player: "Joffre P.", points: 16 },
    { position: 6, player: "Sean W.", points: 15 },
    { position: 7, player: "Ruben C.", points: 14 },
    { position: 8, player: "Miguel Ch.", points: 13 },
    { position: 9, player: "Juan Fernando O.", points: 12 },
    { position: 10, player: "Andres B.", points: 10 },
    { position: 11, player: "Damian A.", points: 8 },
    { position: 12, player: "Carlos Ch.", points: 7 },
    { position: 13, player: "Juan C.", points: 6 },
    { position: 14, player: "Jorge T.", points: 5 },
    { position: 15, player: "Diego B.", points: 4 },
    { position: 16, player: "Juan T.", points: 2 },
    { position: 17, player: "Milton T.", points: 1 },
    { position: 18, player: "Javier M.", points: 0 }
  ] as ImagePlayerResult[],

  // Acumulados después de Fecha 2 (t2.jpeg)
  fecha2_acumulado: [
    { position: 1, player: "Roddy N.", fecha1: 26, fecha2: 27, total: 53 },
    { position: 2, player: "Juan Fernando O.", fecha1: 12, fecha2: 30, total: 42 },
    { position: 3, player: "Freddy L.", fecha1: 23, fecha2: 8, total: 31 },
    { position: 4, player: "Carlos Ch.", fecha1: 7, fecha2: 24, total: 31 },
    { position: 5, player: "Miguel Ch.", fecha1: 13, fecha2: 17, total: 30 },
    { position: 5, player: "Andres B.", fecha1: 10, fecha2: 20, total: 30 },
    { position: 7, player: "Daniel V.", fecha1: 17, fecha2: 12, total: 29 },
    { position: 7, player: "Joffre P.", fecha1: 16, fecha2: 13, total: 29 },
    { position: 9, player: "Juan C.", fecha1: 6, fecha2: 19, total: 25 },
    { position: 10, player: "Ruben C.", fecha1: 14, fecha2: 9, total: 23 },
    { position: 11, player: "Fernando P.", fecha1: 20, fecha2: 2, total: 22 },
    { position: 11, player: "Damian A.", fecha1: 8, fecha2: 14, total: 22 },
    { position: 13, player: "Diego B.", fecha1: 4, fecha2: 16, total: 20 },
    { position: 13, player: "Juan T.", fecha1: 2, fecha2: 18, total: 20 },
    { position: 15, player: "Sean W.", fecha1: 15, fecha2: 0, total: 15 },
    { position: 15, player: "Jorge T.", fecha1: 5, fecha2: 10, total: 15 },
    { position: 17, player: "Jose Luis T.", fecha1: 0, fecha2: 11, total: 11 },
    { position: 18, player: "Milton T.", fecha1: 1, fecha2: 4, total: 5 },
    { position: 19, player: "Javier M.", fecha1: 0, fecha2: 5, total: 5 }
  ] as ImageAccumulatedResult[],

  // Acumulados después de Fecha 3 (t3.jpeg)
  fecha3_acumulado: [
    { position: 1, player: "Juan Fernando O.", fecha1: 12, fecha2: 30, fecha3: 20, total: 62 },
    { position: 2, player: "Roddy N.", fecha1: 26, fecha2: 27, fecha3: 7, total: 60 },
    { position: 3, player: "Miguel Ch.", fecha1: 13, fecha2: 17, fecha3: 23, total: 53 },
    { position: 4, player: "Juan C.", fecha1: 6, fecha2: 19, fecha3: 18, total: 43 },
    { position: 5, player: "Daniel V.", fecha1: 17, fecha2: 12, fecha3: 11, total: 40 },
    { position: 6, player: "Andres B.", fecha1: 10, fecha2: 20, fecha3: 8, total: 38 },
    { position: 7, player: "Fernando P.", fecha1: 20, fecha2: 2, fecha3: 15, total: 37 },
    { position: 8, player: "Ruben C.", fecha1: 14, fecha2: 9, fecha3: 13, total: 36 },
    { position: 8, player: "Diego B.", fecha1: 4, fecha2: 16, fecha3: 16, total: 36 },
    { position: 10, player: "Joffre P.", fecha1: 16, fecha2: 13, fecha3: 5, total: 34 },
    { position: 11, player: "Carlos Ch.", fecha1: 7, fecha2: 24, fecha3: 2, total: 33 },
    { position: 12, player: "Freddy L.", fecha1: 23, fecha2: 8, fecha3: 1, total: 32 },
    { position: 13, player: "Damian A.", fecha1: 8, fecha2: 14, fecha3: 9, total: 31 },
    { position: 14, player: "Jorge T.", fecha1: 5, fecha2: 10, fecha3: 12, total: 27 },
    { position: 15, player: "Juan T.", fecha1: 2, fecha2: 18, fecha3: 6, total: 26 },
    { position: 16, player: "Javier M.", fecha1: 0, fecha2: 5, fecha3: 19, total: 24 },
    { position: 17, player: "Sean W.", fecha1: 15, fecha2: 0, fecha3: 3, total: 18 },
    { position: 18, player: "Jose Luis T.", fecha1: 0, fecha2: 11, fecha3: 4, total: 15 },
    { position: 18, player: "Milton T.", fecha1: 1, fecha2: 4, fecha3: 10, total: 15 }
  ] as ImageAccumulatedResult[],

  // Acumulados después de Fecha 4 (t4.jpeg)
  fecha4_acumulado: [
    { position: 1, player: "Roddy N.", fecha1: 26, fecha2: 27, fecha3: 7, fecha4: 19, total: 79 },
    { position: 2, player: "Juan Fernando O.", fecha1: 12, fecha2: 30, fecha3: 20, fecha4: 4, total: 66 },
    { position: 2, player: "Andres B.", fecha1: 10, fecha2: 20, fecha3: 8, fecha4: 28, total: 66 },
    { position: 4, player: "Juan C.", fecha1: 6, fecha2: 19, fecha3: 18, fecha4: 17, total: 60 },
    { position: 5, player: "Miguel Ch.", fecha1: 13, fecha2: 17, fecha3: 23, fecha4: 6, total: 59 },
    { position: 6, player: "Fernando P.", fecha1: 20, fecha2: 2, fecha3: 15, fecha4: 18, total: 55 },
    { position: 6, player: "Carlos Ch.", fecha1: 7, fecha2: 24, fecha3: 2, fecha4: 22, total: 55 },
    { position: 8, player: "Daniel V.", fecha1: 17, fecha2: 12, fecha3: 11, fecha4: 12, total: 52 },
    { position: 8, player: "Diego B.", fecha1: 4, fecha2: 16, fecha3: 16, fecha4: 16, total: 52 },
    { position: 8, player: "Jorge T.", fecha1: 5, fecha2: 10, fecha3: 12, fecha4: 25, total: 52 },
    { position: 11, player: "Ruben C.", fecha1: 14, fecha2: 9, fecha3: 13, fecha4: 14, total: 50 },
    { position: 12, player: "Freddy L.", fecha1: 23, fecha2: 8, fecha3: 1, fecha4: 11, total: 43 },
    { position: 13, player: "Juan T.", fecha1: 2, fecha2: 18, fecha3: 6, fecha4: 15, total: 41 },
    { position: 14, player: "Damian A.", fecha1: 8, fecha2: 14, fecha3: 9, fecha4: 9, total: 40 },
    { position: 15, player: "Joffre P.", fecha1: 16, fecha2: 13, fecha3: 5, fecha4: 2, total: 36 },
    { position: 16, player: "Javier M.", fecha1: 0, fecha2: 5, fecha3: 19, fecha4: 3, total: 27 },
    { position: 17, player: "Milton T.", fecha1: 1, fecha2: 4, fecha3: 10, fecha4: 10, total: 25 },
    { position: 18, player: "Jose Luis T.", fecha1: 0, fecha2: 11, fecha3: 4, fecha4: 8, total: 23 },
    { position: 19, player: "Sean W.", fecha1: 15, fecha2: 0, fecha3: 3, fecha4: 1, total: 19 }
  ] as ImageAccumulatedResult[]
};

// Mapeo de nombres cortos en imágenes a nombres completos
export const IMAGE_NAME_MAPPING: Record<string, string> = {
  "Roddy N.": "Roddy Naranjo",
  "Freddy L.": "Freddy Lopez",
  "Fernando P.": "Fernando Peña",
  "Daniel V.": "Daniel Vela",
  "Joffre P.": "Joffre Palacios",
  "Sean W.": "Sean Willis",
  "Ruben C.": "Ruben Cadena",
  "Miguel Ch.": "Miguel Chiesa",
  "Juan Fernando O.": "Juan Fernando Ochoa",
  "Andres B.": "Andres Benites",
  "Damian A.": "Damian Amador",
  "Carlos Ch.": "Carlos Chacón",
  "Juan C.": "Juan Antonio Cortez",
  "Jorge T.": "Jorge Tamayo",
  "Diego B.": "Diego Behar",
  "Juan T.": "Juan Tapia",
  "Milton T.": "Milton Tapia",
  "Javier M.": "Javier Martinez",
  "Jose Luis T.": "Jose Luis Toral"
};

// Mapeo de apodos oficiales del grupo a nombres completos
export const NICKNAME_MAPPING: Record<string, string> = {
  // Apodos oficiales del grupo
  "coque": "Juan Tapia",
  "coqueta": "Juan Tapia", // Nueva variante
  "jac": "Juan Antonio Cortez", 
  "pit": "Joffre Palacios",
  "perro": "Miguel Chiesa",
  "vela": "Daniel Vela",
  
  // Nombres comunes adicionales
  "freddy": "Freddy Lopez",
  "roddy": "Roddy Naranjo",
  "mono": "Mono Benites",
  "diego": "Diego Behar",
  "apolinar": "Apolinar Externo",
  "jorge": "Jorge Tamayo",
  "carlos": "Carlos Chacón",
  "damian": "Damian Amador",
  "juan g": "Juan Guajardo",
  "jfo": "Juan Fernando Ochoa",
  "javi": "Javier Martinez", // Nuevo
  "joto": "Jose Luis Toral", // Nuevo
  "fer": "Fernando Peña", // Nuevo
  "chino": "Invitado SN", // Nuevo - invitado
  "ruben": "Ruben Cadena",
  "sean": "Sean Willis",
  "meche": "Meche Garrido",
  "agustin": "Agustin Guerrero",
  "milton": "Milton Tapia",
  "juan t": "Juan Tapia",
  "jose patricio": "Jose Patricio Moreno"
};

// Datos oficiales de eliminaciones Fecha 2 (de f2-11.png y f2-2.png)
export const FECHA2_ELIMINACIONES_OFICIALES = [
  // De f2-11.png (posiciones 8-23)
  { position: 23, eliminatedPlayer: "jose patricio", eliminatorPlayer: "jfo", time: "21:23" },
  { position: 22, eliminatedPlayer: "fer", eliminatorPlayer: "chino", time: "21:23" },
  { position: 21, eliminatedPlayer: "chino", eliminatorPlayer: "carlos", time: "21:23" },
  { position: 20, eliminatedPlayer: "milton", eliminatorPlayer: "mono", time: "21:23" },
  { position: 19, eliminatedPlayer: "javi", eliminatorPlayer: "jac", time: "21:32" },
  { position: 18, eliminatedPlayer: "apolinar", eliminatorPlayer: "damian", time: "21:49" },
  { position: 17, eliminatedPlayer: "agustin", eliminatorPlayer: "meche", time: "21:57" },
  { position: 16, eliminatedPlayer: "freddy", eliminatorPlayer: "juan t", time: "22:28" },
  { position: 15, eliminatedPlayer: "ruben", eliminatorPlayer: "jfo", time: "22:38" },
  { position: 14, eliminatedPlayer: "jorge", eliminatorPlayer: "jfo", time: "22:38" },
  { position: 13, eliminatedPlayer: "joto", eliminatorPlayer: "carlos", time: "22:41" },
  { position: 12, eliminatedPlayer: "vela", eliminatorPlayer: "diego", time: "22:56" },
  { position: 11, eliminatedPlayer: "joffre", eliminatorPlayer: "roddy", time: "22:59" },
  { position: 10, eliminatedPlayer: "damian", eliminatorPlayer: "juan t", time: "23:01" },
  { position: 9, eliminatedPlayer: "diego", eliminatorPlayer: "jfo", time: "23:13" },
  { position: 8, eliminatedPlayer: "miguel", eliminatorPlayer: "jfo", time: "23:37" },
  
  // De f2-2.png (posiciones 1-7)
  { position: 7, eliminatedPlayer: "coqueta", eliminatorPlayer: "jfo", time: "23:47" },
  { position: 6, eliminatedPlayer: "joto", eliminatorPlayer: "meche", time: "23:54" },
  { position: 5, eliminatedPlayer: "mono", eliminatorPlayer: "jfo", time: "23:57" },
  { position: 4, eliminatedPlayer: "meche", eliminatorPlayer: "roddy", time: "00:21" },
  { position: 3, eliminatedPlayer: "carlos", eliminatorPlayer: "roddy", time: "00:22" },
  { position: 2, eliminatedPlayer: "roddy", eliminatorPlayer: "jfo", time: "00:29" },
  { position: 1, eliminatedPlayer: "jfo", eliminatorPlayer: "", time: "00:29" } // Ganador sin eliminador
] as Array<{position: number, eliminatedPlayer: string, eliminatorPlayer: string, time: string}>;