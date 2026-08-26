// Configuration : Mettez votre numéro complet ici (avec l'indicatif du pays)
const NUMERO_WHATSAPP = "+25767740624"; 

const selectProduit = document.getElementById("produit");
const inputQuantite = document.getElementById("quantite");
const spanTotal = document.getElementById("totalPrix");
const form = document.getElementById("orderForm");

// Fonction de mise à jour du prix total
function updateTotal() {
  const prixUnitaire = parseFloat(selectProduit.options[selectProduit.selectedIndex].getAttribute("data-price"));
  const quantite = parseInt(inputQuantite.value) || 1;
  const total = prixUnitaire * quantite;
  spanTotal.textContent = total;
}

// Événements pour recalculer quand le client change le produit ou la quantité
selectProduit.addEventListener("change", updateTotal);
inputQuantite.addEventListener("change", updateTotal);
inputQuantite.addEventListener("input", updateTotal);

// Événement lors du clic sur le bouton "Envoyer"
form.addEventListener("submit", function(e) {
  e.preventDefault();

  const nom = document.getElementById("nom").value.trim();
  const prenom = document.getElementById("prenom").value.trim();
  const produit = selectProduit.value;
  const quantite = inputQuantite.value;
  const total = spanTotal.textContent;

  // Création du message pré-rempli pour WhatsApp
  const message = `Bonjour ! Je souhaite passer une commande :\n\n` +
                  `👤 *Nom :* ${nom}\n` +
                  `👤 *Prénom :* ${prenom}\n` +
                  `🛍️ *Produit :* ${produit}\n` +
                  `🔢 *Quantité :* ${quantite}\n` +
                  `💵 *Total :* ${total} $\n\n` +
                  `Merci de me confirmer la procédure de paiement.`;

  // Lien direct WhatsApp (API wa.me)
  const urlWhatsApp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`;

  // Ouvre WhatsApp immédiatement avec le message pré-rempli
  window.open(urlWhatsApp, "_blank");
});