const NUMERO_WHATSAPP = "25767740624"; 

const selectPays = document.getElementById("pays");
const selectProduit = document.getElementById("produit");
const inputQuantite = document.getElementById("quantite");
const selectDevise = document.getElementById("devise");
const selectPaiement = document.getElementById("paiement");
const errorBox = document.getElementById("errorBox");
const form = document.getElementById("orderForm");

// ==========================================
// 1. API LISTE DES PAYS D'AFRIQUE
// ==========================================
async function chargerPaysAfrique() {
  const urlAPI = "https://restcountries.com/v3.1/region/africa";

  try {
    const reponse = await fetch(urlAPI);
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);

    const paysData = await reponse.json();

    // Tri alphabétique basé sur le nom en français
    paysData.sort((a, b) => {
      const nomA = a.translations?.fra?.common || a.name.common;
      const nomB = b.translations?.fra?.common || b.name.common;
      return nomA.localeCompare(nomB, 'fr');
    });

    selectPays.innerHTML = '<option value="">-- Sélectionnez un pays d\'Afrique --</option>';

    paysData.forEach(country => {
      const nomPays = country.translations?.fra?.common || country.name.common;
      const option = document.createElement("option");
      option.value = nomPays;
      option.textContent = nomPays;
      
      if (nomPays === "Burundi") {
        option.selected = true;
      }
      selectPays.appendChild(option);
    });

  } catch (erreur) {
    console.error("Erreur API Pays :", erreur);
    selectPays.innerHTML = `
      <option value="">-- Sélectionnez un pays --</option>
      <option value="Burundi" selected>Burundi</option>
      <option value="Rwanda">Rwanda</option>
      <option value="RDC">République Démocratique du Congo</option>
      <option value="Ouganda">Ouganda</option>
      <option value="Tanzanie">Tanzanie</option>
      <option value="Kenya">Kenya</option>
    `;
  }
}

chargerPaysAfrique();

// ==========================================
// 2. MÉTÉO EN TEMPS RÉEL (SYNCHRONISÉE & AUTOMATIQUE)
// ==========================================
const LATITUDE = -3.3822;  // Bujumbura
const LONGITUDE = 29.3644;

// Fonction de traduction du WMO Weathercode
function interpreterCodeMeteo(code) {
  if (code === 0) {
    return { texte: "Ensoleillé / Ciel Dégagé", icon: "☀️", bg: "#fffde7", border: "#ffe082" };
  } else if (code >= 1 && code <= 3) {
    return { texte: "Partiellement Nuageux", icon: "⛅", bg: "#e3f2fd", border: "#90caf9" };
  } else if (code === 45 || code === 48) {
    return { texte: "Brouillard", icon: "🌫️", bg: "#eceff1", border: "#b0bec5" };
  } else if (code >= 51 && code <= 67) {
    return { texte: "Pluie Légère / Bruine", icon: "🌦️", bg: "#e8eaf6", border: "#9fa8da" };
  } else if (code >= 80 && code <= 82) {
    return { texte: "Averses de Pluie", icon: "🌧️", bg: "#e1f5fe", border: "#81d4fa" };
  } else if (code >= 95 && code <= 99) {
    return { texte: "Orage", icon: "⛈️", bg: "#f3e5f5", border: "#ce93d8" };
  } else {
    return { texte: "Nuageux / Variable", icon: "🌤️", bg: "#e3f2fd", border: "#90caf9" };
  }
}

async function chargerMeteoDynamique() {
  // timezone=auto assure l'heure locale exacte, et le timestamp contourne le cache navigateur
  const timestamp = new Date().getTime();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current_weather=true&timezone=auto&_=${timestamp}`;
  
  try {
    const reponse = await fetch(url, { cache: "no-store" });
    const data = await reponse.json();
    
    const temp = Math.round(data.current_weather.temperature);
    const vent = Math.round(data.current_weather.windspeed);
    const weatherCode = data.current_weather.weathercode;

    // Interpréter le climat exact renvoyé par le serveur
    const infoClimat = interpreterCodeMeteo(weatherCode);

    // Mise à jour des valeurs HTML
    document.getElementById("temp").textContent = temp;
    document.getElementById("vent").textContent = vent;
    document.getElementById("climatTexte").innerHTML = `${infoClimat.icon} ${infoClimat.texte}`;

    // Modification dynamique de l'apparence du widget selon le climat
    const meteoCard = document.getElementById("meteoCard");
    meteoCard.style.backgroundColor = infoClimat.bg;
    meteoCard.style.borderColor = infoClimat.border;

  } catch (erreur) {
    console.error("Erreur météo :", erreur);
    document.getElementById("climatTexte").textContent = "⚠️ Météo indisponible";
  }
}

// Premier chargement au lancement
chargerMeteoDynamique();

// Actualisation automatique toutes les 60 secondes (1 minute)
setInterval(chargerMeteoDynamique, 60000);

// ==========================================
// 3. LOGIQUE DE VALIDATION ET ENVOI
// ==========================================
function validerPaiement(pays, devise, paiement) {
  errorBox.style.display = "none";
  errorBox.textContent = "";

  if (!pays) {
    afficherErreur("Veuillez sélectionner un pays d'Afrique.");
    return false;
  }
  if (!devise) {
    afficherErreur("Veuillez choisir une devise de règlement.");
    return false;
  }
  if (!paiement) {
    afficherErreur("Veuillez sélectionner un mode de paiement validé.");
    return false;
  }

  return true;
}

function afficherErreur(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";
}

form.addEventListener("submit", function(e) {
  e.preventDefault();

  const nom = document.getElementById("nom").value.trim();
  const prenom = document.getElementById("prenom").value.trim();
  const pays = selectPays.value;
  const produit = selectProduit.value;
  const quantite = inputQuantite.value;
  const devise = selectDevise.value;
  const modePaiement = selectPaiement.value;

  if (!validerPaiement(pays, devise, modePaiement)) {
    return;
  }

  const message = `*COMMANDES ET PAIEMENT VALIDÉS*\n\n` +
                  `👤 *Nom :* ${nom}\n` +
                  `👤 *Prénom :* ${prenom}\n` +
                  `🌍 *Pays (Afrique) :* ${pays}\n` +
                  `🛍️ *Produit :* ${produit}\n` +
                  `🔢 *Quantité :* ${quantite}\n` +
                  `💱 *Devise :* ${devise}\n` +
                  `💳 *Mode de paiement :* ${modePaiement}\n\n` +
                  `Bonjour, ma commande est validée. Merci de procéder au traitement.`;

  const urlWhatsApp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`;

  window.open(urlWhatsApp, "_blank");
});