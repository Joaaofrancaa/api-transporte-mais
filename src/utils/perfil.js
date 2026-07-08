function getBasePerfil(perfil) {
  return String(perfil || "").split("|")[0];
}

module.exports = { getBasePerfil };
