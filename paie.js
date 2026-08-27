// ⚠️ Collez ici l'URL obtenue lors du déploiement Google Apps Script
const URL_GOOGLE_SHEETS = "https://script.google.com/macros/s/AKfycbw-NZflK3eIZwP69ub4CykDxtNHXDXpS3mbuUwkmuEdlIWyuhqJa-cBt9lE-Z5JXNxQ/exec";

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

const inputNomComplet = document.getElementById("nomComplet");
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
    const listePaysSecours = ["Burundi", "Rwanda", "République Démocratique du Congo", "Tanzanie", "Ouganda", "Kenya", "France", "Canada", "États-Unis", "Belgique"];
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
// 2. API MÉTÉO DYNAMIQUE (Bujumbura)
// ==========================================
const LATITUDE = -3.3822;
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current_weather=true`;

  try {
    const reponse = await fetch(url);
    if (!reponse.ok) throw new Error(`Erreur HTTP: ${reponse.status}`);

    const data = await reponse.json();
    if (!data.current_weather) throw new Error("Données météo absentes");

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

    const maintenant = new Date();
    document.getElementById("meteoTime").textContent = `Dernière mise à jour : ${maintenant.toLocaleTimeString('fr-FR')}`;

  } catch (erreur) {
    document.getElementById("climatTexte").textContent = "⚠️ Météo indisponible";
  }
}

chargerMeteoDynamique();
btnRefreshMeteo.addEventListener("click", chargerMeteoDynamique);

// ==========================================
// 3. FONCTION ENREGISTREMENT GOOGLE SHEETS
// ==========================================
async function enregistrerCommandeDansGoogleSheets(donnees) {
  try {
    await fetch(URL_GOOGLE_SHEETS, {
      method: "POST",
      mode: "no-cors", // Nécessaire pour éviter les blocages de sécurité CORS Google
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donnees)
    });
    console.log("Commande enregistrée avec succès dans Google Sheets !");
  } catch (err) {
    console.error("Erreur lors de l'enregistrement dans Google Sheets :", err);
  }
}

// ==========================================
// 4. VALIDATION & PAIEMENT
// ==========================================
function validerFormulaire() {
  errorBox.style.display = "none";
  successBox.style.display = "none";

  const nomComplet = inputNomComplet.value.trim();
  const pays = selectPays.value;
  const devise = selectDevise.value;
  const paiement = selectPaiement.value;

  if (!nomComplet || !pays || !devise || !paiement) {
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

// Clic bouton Paiement en ligne
btnPayerEnLigne.addEventListener("click", async function() {
  if (!validerFormulaire()) return;

  const nomComplet = inputNomComplet.value.trim();
  const pays = selectPays.value;
  const produit = selectProduit.value;
  const quantite = inputQuantite.value;
  const devise = selectDevise.value;
  const modePaiement = selectPaiement.value;
  const referenceCommande = "CMD-" + Date.now();

  const donneesCommande = {
    reference: referenceCommande,
    nomComplet: nomComplet,
    pays: pays,
    produit: produit,
    quantite: quantite,
    devise: devise,
    modePaiement: modePaiement,
    statut: "Validé (En ligne)"
  };

  if (modePaiement === "stripe") {
    btnPayerEnLigne.disabled = true;
    btnPayerEnLigne.textContent = "⏳ Traitement Stripe...";

    const { token, error } = await stripe.createToken(cardElement, { name: nomComplet });

    if (error) {
      afficherErreur("Erreur carte Stripe : " + error.message);
      btnPayerEnLigne.disabled = false;
      btnPayerEnLigne.textContent = "💳 Valider et Payer en ligne";
    } else {
      // Enregistrement automatique dans Google Sheets
      await enregistrerCommandeDansGoogleSheets(donneesCommande);

      afficherSucces(`
        🎉 <strong>PAIEMENT STRIPE VALIDÉ ET ENREGISTRÉ !</strong><br>
        Client : <strong>${nomComplet}</strong><br>
        Commande : <strong>${quantite}x ${produit}</strong><br>
        Référence : <strong>${referenceCommande}</strong>
      `);
      btnPayerEnLigne.disabled = false;
      btnPayerEnLigne.textContent = "💳 Valider et Payer en ligne";
    }
  } else {
    // Enregistrement automatique dans Google Sheets
    await enregistrerCommandeDansGoogleSheets(donneesCommande);

    afficherSucces(`
      🎉 <strong>PAIEMENT VALIDÉ ET ENREGISTRÉ !</strong><br>
      Client : <strong>${nomComplet}</strong><br>
      Mode : <strong>${modePaiement}</strong> (${devise})<br>
      Référence : <strong>${referenceCommande}</strong>
    `);
  }
});

// Clic bouton WhatsApp
btnEnvoyerWhatsApp.addEventListener("click", async function() {
  if (!validerFormulaire()) return;

  const nomComplet = inputNomComplet.value.trim();
  const pays = selectPays.value;
  const produit = selectProduit.value;
  const quantite = inputQuantite.value;
  const devise = selectDevise.value;
  const modePaiement = selectPaiement.value;
  const referenceCommande = "CMD-" + Date.now();

  const donneesCommande = {
    reference: referenceCommande,
    nomComplet: nomComplet,
    pays: pays,
    produit: produit,
    quantite: quantite,
    devise: devise,
    modePaiement: modePaiement,
    statut: "Envoyé via WhatsApp"
  };

  // Enregistrement automatique dans Google Sheets
  await enregistrerCommandeDansGoogleSheets(donneesCommande);

  const msg = `*NOUVELLE COMMANDE DIRECTE*\n\n` +
              `👤 *Client :* ${nomComplet}\n` +
              `🌍 *Pays :* ${pays}\n` +
              `🛍️ *Produit :* ${produit} (x${quantite})\n` +
              `💱 *Devise :* ${devise}\n` +
              `💳 *Mode :* ${modePaiement}\n` +
              `🔖 *Référence :* ${referenceCommande}`;

  window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
});