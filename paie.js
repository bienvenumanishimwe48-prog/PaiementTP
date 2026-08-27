const NUMERO_WHATSAPP = "25767740624"; 

// Initialisation Stripe Elements
const STRIPE_PUBLIC_KEY = "pk_test_51PxExampleYourPublicKeyHere"; 
const stripe = Stripe(STRIPE_PUBLIC_KEY);
const elements = stripe.elements();

const cardElement = elements.create("card", {
  style: {
    base: { fontSize: "14px", color: "#32325d", "::placeholder": { color: "#aab7c4" } },
    invalid: { color: "#fa755a" }
  }
});
cardElement.mount("#card-element");

const selectPays = document.getElementById("pays");
const selectProduit = document.getElementById("produit");
const inputQuantite = document.getElementById("quantite");
const selectDevise = document.getElementById("devise");
const selectPaiement = document.getElementById("paiement");
const stripeCardContainer = document.getElementById("stripeCardContainer");

const errorBox = document.getElementById("errorBox");
const successBox = document.getElementById("successBox");
const btnPayerEnLigne = document.getElementById("btnPayerEnLigne");
const btnEnvoyerWhatsApp = document.getElementById("btnEnvoyerWhatsApp");
const btnRefreshMeteo = document.getElementById("btnRefreshMeteo");

selectPaiement.addEventListener("change", function() {
  stripeCardContainer.style.display = (this.value === "stripe") ? "block" : "none";
});

// ==========================================
// 1. API LISTE COMPLÈTE PAYS
// ==========================================
async function chargerTousLesPays() {
  try {
    const reponse = await fetch("https://restcountries.com/v3.1/all");
    const paysData = await reponse.json();

    paysData.sort((a, b) => {
      const nomA = a.translations?.fra?.common || a.name.common;
      const nomB = b.translations?.fra?.common || b.name.common;
      return nomA.localeCompare(nomB, 'fr');
    });

    selectPays.innerHTML = '<option value="">-- Sélectionnez votre pays --</option>';
    paysData.forEach(country => {
      const nomPays = country.translations?.fra?.common || country.name.common;
      const option = document.createElement("option");
      option.value = nomPays;
      option.textContent = nomPays;
      if (nomPays === "Burundi") option.selected = true;
      selectPays.appendChild(option);
    });
  } catch (erreur) {
    const listePaysSecours = [
      "Burundi", "Rwanda", "République Démocratique du Congo", "Tanzanie", "Ouganda", "Kenya",
      "Afrique du Sud", "Algérie", "Allemagne", "Angola", "Belgique", "Cameroun", "Canada", 
      "Chine", "Côte d'Ivoire", "Égypte", "Espagne", "États-Unis", "France", "Gabon", "Maroc", 
      "Nigeria", "Royaume-Uni", "Sénégal", "Suisse", "Tchad", "Togo", "Tunisie"
    ];
    selectPays.innerHTML = '<option value="">-- Sélectionnez votre pays --</option>';
    listePaysSecours.sort().forEach(pays => {
      const option = document.createElement("option");
      option.value = pays;
      option.textContent = pays;
      if (pays === "Burundi") option.selected = true;
      selectPays.appendChild(option);
    });
  }
}
chargerTousLesPays();

// ==========================================
// 2. API MÉTÉO DYNAMIQUE AUTO-ACTUALISÉE
// ==========================================
const LATITUDE = -3.3822;  // Bujumbura
const LONGITUDE = 29.3644;

function interpreterCodeMeteo(code) {
  if (code === 0) return { texte: "Ensoleillé / Ciel Dégagé", icon: "☀️", bg: "#fffde7", border: "#ffe082" };
  if (code >= 1 && code <= 3) return { texte: "Partiellement Nuageux", icon: "⛅", bg: "#e3f2fd", border: "#90caf9" };
  if (code === 45 || code === 48) return { texte: "Brouillard", icon: "🌫️", bg: "#eceff1", border: "#b0bec5" };
  if (code >= 51 && code <= 67) return { texte: "Pluie Légère", icon: "🌦️", bg: "#e8eaf6", border: "#9fa8da" };
  if (code >= 80 && code <= 82) return { texte: "Averses de Pluie", icon: "🌧️", bg: "#e1f5fe", border: "#81d4fa" };
  if (code >= 95 && code <= 99) return { texte: "Orage", icon: "⛈️", bg: "#f3e5f5", border: "#ce93d8" };
  return { texte: "Nuageux / Variable", icon: "🌤️", bg: "#e3f2fd", border: "#90caf9" };
}

async function chargerMeteoDynamique() {
  // L'ajout du timestamp force l'API à donner la donnée la plus fraîche sans cache
  const timestamp = Date.now();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current_weather=true&timezone=auto&_=${timestamp}`;

  try {
    const reponse = await fetch(url, { cache: "no-store" });
    const data = await reponse.json();

    const temp = Math.round(data.current_weather.temperature);
    const vent = Math.round(data.current_weather.windspeed);
    const codeClimat = data.current_weather.weathercode;

    document.getElementById("temp").textContent = temp;
    document.getElementById("vent").textContent = vent;

    const infoClimat = interpreterCodeMeteo(codeClimat);
    document.getElementById("climatTexte").innerHTML = `${infoClimat.icon} ${infoClimat.texte}`;

    const meteoCard = document.getElementById("meteoCard");
    meteoCard.style.backgroundColor = infoClimat.bg;
    meteoCard.style.borderColor = infoClimat.border;

    // Affichage de l'heure exacte du changement
    const heureActuelle = new Date().toLocaleTimeString('fr-FR');
    document.getElementById("meteoTime").textContent = `Dernière mise à jour : ${heureActuelle}`;

  } catch (erreur) {
    document.getElementById("climatTexte").textContent = "⚠️ Météo indisponible";
  }
}

// Chargement initial
chargerMeteoDynamique();

// Bouton pour actualiser manuellement
btnRefreshMeteo.addEventListener("click", chargerMeteoDynamique);

// Actualisation automatique en arrière-plan (toutes les 15 secondes)
setInterval(chargerMeteoDynamique, 15000);

// ==========================================
// 3. VALIDATION & PAIEMENT
// ==========================================
function validerFormulaire() {
  errorBox.style.display = "none";
  successBox.style.display = "none";

  const nom = document.getElementById("nom").value.trim();
  const prenom = document.getElementById("prenom").value.trim();
  const pays = selectPays.value;
  const devise = selectDevise.value;
  const paiement = selectPaiement.value;

  if (!nom || !prenom || !pays || !devise || !paiement) {
    afficherErreur("Veuillez remplir tous les champs du formulaire.");
    return false;
  }
  return true;
}

function afficherErreur(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
  successBox.style.display = "none";
}

function afficherSucces(msg) {
  successBox.innerHTML = msg;
  successBox.style.display = "block";
  errorBox.style.display = "none";
}

btnPayerEnLigne.addEventListener("click", async function() {
  if (!validerFormulaire()) return;

  const nom = document.getElementById("nom").value.trim();
  const prenom = document.getElementById("prenom").value.trim();
  const produit = selectProduit.value;
  const quantite = inputQuantite.value;
  const devise = selectDevise.value;
  const modePaiement = selectPaiement.value;
  const referenceCommande = "CMD-" + Date.now();

  if (modePaiement === "stripe") {
    btnPayerEnLigne.disabled = true;
    btnPayerEnLigne.textContent = "⏳ Traitement Stripe...";

    const { token, error } = await stripe.createToken(cardElement, { name: `${prenom} ${nom}` });

    if (error) {
      afficherErreur("Erreur carte Stripe : " + error.message);
      btnPayerEnLigne.disabled = false;
      btnPayerEnLigne.textContent = "💳 Valider et Payer en ligne";
    } else {
      afficherSucces(`
        🎉 <strong>PAIEMENT STRIPE VALIDÉ AVEC SUCCÈS !</strong><br>
        Transaction pour <strong>${quantite}x ${produit}</strong>.<br>
        Token : <code>${token.id}</code><br>
        Référence : <strong>${referenceCommande}</strong>
      `);
      btnPayerEnLigne.disabled = false;
      btnPayerEnLigne.textContent = "💳 Valider et Payer en ligne";
    }
  } else {
    afficherSucces(`
      🎉 <strong>PAIEMENT EN LIGNE VALIDÉ !</strong><br>
      Nom : <strong>${prenom} ${nom}</strong><br>
      Mode : <strong>${modePaiement}</strong> (${devise})<br>
      Référence : <strong>${referenceCommande}</strong>
    `);
  }
});

btnEnvoyerWhatsApp.addEventListener("click", function() {
  if (!validerFormulaire()) return;

  const nom = document.getElementById("nom").value.trim();
  const prenom = document.getElementById("prenom").value.trim();
  const pays = selectPays.value;
  const produit = selectProduit.value;
  const quantite = inputQuantite.value;
  const devise = selectDevise.value;
  const modePaiement = selectPaiement.value;
  const referenceCommande = "CMD-" + Date.now();

  const msg = `*NOUVELLE COMMANDE DIRECTE*\n\n` +
              `👤 *Client :* ${nom} ${prenom}\n` +
              `🌍 *Pays :* ${pays}\n` +
              `🛍️ *Produit :* ${produit} (x${quantite})\n` +
              `💱 *Devise :* ${devise}\n` +
              `💳 *Mode :* ${modePaiement}\n` +
              `🔖 *Référence :* ${referenceCommande}`;

  window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
});