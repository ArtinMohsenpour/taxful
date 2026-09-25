import { coverageMessages } from './invoice-coverage'
export const invoiceMessages = {
  en: {
    ...coverageMessages.en,
    new: 'Create invoice',
    unassigned: 'Unassigned uploads',
    fileSections: 'Invoice direction',
    filesIntro:
      'Outgoing invoices are issued by your company to customers. Incoming invoices are received from suppliers or other businesses.',
    issueNotice:
      'The first validated export issues and locks this invoice. Check all details before continuing.',
    incoming: 'Incoming invoices',
    outgoing: 'Outgoing invoices',
    customers: 'Customers',
    products: 'Products & services',
    newIntro:
      'Create a draft for a customer. Your company details are copied from your profile; complete and approve the invoice before generating a validated export.',
    incomingIntro:
      'Upload XRechnung XML, ZUGFeRD/Factur-X PDFs, ordinary PDFs, images or DOCX. Review the invoice and keep the supplier’s unchanged original.',
    importPrivacy:
      'Structured XML and embedded invoice data are read locally without AI. Ordinary PDFs, scans, images and Word documents use the configured AI extraction service after safety checks.',
    aiOptional:
      'AI extraction is unavailable. Structured XML and ZUGFeRD imports still work; ordinary documents need AI configured before they can be processed.',
    xmlPreviewHint:
      'Original XML shown as text. The incoming review presents its invoice data in a readable summary.',
    structuredValid: 'E-invoice format validation passed',
    structuredInvalid: 'E-invoice validation needs attention',
    structuredHint:
      'Read directly from the supplier’s XML, without AI. This view is a summary; the unchanged original contains all allowances, tax categories, payment details and references. Technical validation does not confirm the invoice’s authenticity or visual/XML agreement.',
    inputInvoiceInvalid:
      'This incoming e-invoice failed validation. Check the original and ask the supplier for a corrected invoice before marking it reviewed.',
    inputPdfInvalid: 'The PDF container did not pass PDF/A validation.',
    invalidInvoiceXml:
      'The XML is malformed, unsafe or uses an unsupported encoding. Upload a UTF-8 invoice without DTDs or external entities.',
    ambiguousInvoiceXml:
      'The XML contains ambiguous or duplicate invoice fields and cannot be imported safely.',
    unsupportedInvoiceProfile:
      'This XML uses an unsupported invoice profile, document type or VAT category. Supported types are invoices, supplier credit notes, corrections, partial and advance invoices. Self-billing is not supported.',
    invoiceImportLimit: 'The invoice exceeds the supported field or line-item limits.',
    xmlTooLarge: 'The invoice XML exceeds the 1 MB import limit.',
    structuredIncomingOnly: 'Upload this structured supplier invoice under Incoming invoices.',
    selectCustomer: 'Use a saved customer',
    customerManual: 'Enter customer details manually',
    customerReplaceHint:
      'Selecting a customer replaces the recipient details in this draft. It does not change the saved customer.',
    saveCustomer: 'Save these customer details for future invoices when I approve this draft.',
    customerSaved: 'These customer details have been saved to your customer directory.',
    customerInvalid:
      'Check the customer name, country code, VAT ID and email before saving the customer.',
    outgoingIntro: 'Manage drafts and validated invoices issued by your company.',
    customersIntro:
      'Save customer billing details for new invoices. Changes here do not alter existing drafts or issued invoices.',
    productsIntro:
      'Save reusable descriptions and net prices in EUR, with standard VAT, zero rating, exemption or reverse charge. Confirm the tax treatment for each invoice.',
    importDraft: 'Import an existing draft',
    recommended: 'Recommended',
    importRecommendedHint:
      'Already have an invoice as a PDF, image or Word document? Import it to prefill the draft, then review and approve the details.',
    viewOutgoing: 'View outgoing invoices',
    importHint: 'Only import invoices you are authorized to issue on behalf of your company.',
    customer: 'Customer',
    noCustomer: 'Enter customer details in the draft',
    chooseProducts: 'Add products or services (optional)',
    create: 'Create draft',
    draftHint:
      'A unique TF-year-number is reserved when you create a draft and is never reused. Creating a draft uses one daily document allowance. No AI or file upload is needed.',
    numberHint: 'This invoice number is reserved and cannot be changed.',
    profileLink: 'Update your company details',
    directoryLink: 'Manage customers',
    save: 'Save',
    saving: 'Saving…',
    edit: 'Edit',
    archive: 'Archive',
    cancel: 'Cancel',
    add: 'Add entry',
    search: 'Search directory',
    empty: 'No entries yet. Add your first entry above.',
    limitHint: 'Showing up to 200 matches. Search to find older entries.',
    readonly: 'Owners and administrators manage this directory.',
    saved: 'Changes saved.',
    archived: 'Entry archived. Existing invoices are unchanged.',
    companyName: 'Legal / company name',
    name: 'Contact name',
    address: 'Street and number',
    postalCode: 'Postal code',
    city: 'City',
    country: 'Country code',
    vatId: 'VAT ID',
    taxNumber: 'Tax number',
    email: 'Email',
    phone: 'Phone',
    description: 'Description',
    unitPrice: 'Net unit price (EUR)',
    taxRate: 'VAT rate',
    unitCode: 'Billing unit',
    unit: 'Service / unit',
    piece: 'Piece',
    hour: 'Hour',
    day: 'Day',
    month: 'Month',
    draft: 'Draft',
    issued: 'Issued',
    sent: 'Sent',
    paid: 'Paid',
    issuedHint:
      'This validated invoice is locked. You can download it or generate the other supported format from the same approved data.',
    markSent: 'Record as sent',
    markPaid: 'Record as paid',
    trackingHint:
      'These actions only update your records. Taxful does not send an email or collect payment.',
    incomingHint:
      'This is a received invoice. Keep the supplier’s original; this review does not create or validate a new e-invoice.',
    markReviewed: 'Mark as reviewed',
    receivedReviewed: 'Original reviewed',
    checkOriginal: 'I have checked the original and the extracted information.',
    unclassified: 'Choose the invoice workflow',
    classifyHint:
      'This older upload has not been assigned. Choose outgoing only if you are authorized to issue it; otherwise keep it as a received document.',
    classifyIncoming: 'Received from a supplier',
    classifyOutgoing: 'Issued by my company',
    manual: 'Manually created draft',
    manualReview:
      'Review the invoice you are issuing. Complete the required fields, check the totals and approve before export.',
    manualConfirm:
      'I confirm this invoice is complete, accurate and authorized for issue by my company.',
    summary: 'Extracted information',
    noData: 'No invoice information is available. Use the original document to review this file.',
    genericError: 'The change could not be saved. Please try again.',
    invalidRequest: 'Check the fields and your active company.',
    conflict:
      'This record changed or the request is no longer available. Refresh before trying again.',
    forbidden: 'You do not have permission for this action.',
    dailyLimit: 'Your daily document allowance has been reached.',
    monthlyLimit: 'Your company has reached its monthly document allowance. Ask the owner to review the subscription.',
    workflowRequired: 'Choose incoming or outgoing before continuing.',
    invoiceLocked: 'An issued invoice cannot be edited.',
    numberLocked: 'The reserved invoice number cannot be changed.',
    numberTaken: 'This invoice number is already used by your company.',
    invalidState: 'This action is not available at the current step.',
  },
  de: {
    ...coverageMessages.de,
    new: 'Rechnung erstellen',
    unassigned: 'Nicht zugeordnete Uploads',
    fileSections: 'Rechnungsrichtung',
    filesIntro:
      'Ausgangsrechnungen stellen Sie Ihren Kunden. Eingangsrechnungen erhalten Sie von Lieferanten oder anderen Unternehmen.',
    issueNotice:
      'Der erste validierte Export stellt diese Rechnung aus und sperrt sie für Änderungen. Prüfen Sie vorher alle Angaben.',
    incoming: 'Eingangsrechnungen',
    outgoing: 'Ausgangsrechnungen',
    customers: 'Kunden',
    products: 'Produkte & Leistungen',
    newIntro:
      'Erstellen Sie einen Entwurf für einen Kunden. Ihre Firmendaten werden aus dem Profil übernommen. Vervollständigen und prüfen Sie die Rechnung vor dem validierten Export.',
    incomingIntro:
      'Laden Sie XRechnung-XML, ZUGFeRD-/Factur-X-PDFs, gewöhnliche PDFs, Bilder oder DOCX hoch. Prüfen Sie die Rechnung und bewahren Sie das unveränderte Lieferantenoriginal auf.',
    importPrivacy:
      'Strukturierte XML und eingebettete Rechnungsdaten werden lokal ohne KI gelesen. Gewöhnliche PDFs, Scans, Bilder und Word-Dateien werden nach der Sicherheitsprüfung mit dem eingerichteten KI-Dienst ausgelesen.',
    aiOptional:
      'Die KI-Extraktion ist nicht verfügbar. Strukturierte XML und ZUGFeRD können weiterhin importiert werden. Für gewöhnliche Dokumente muss die KI vor der Verarbeitung eingerichtet sein.',
    xmlPreviewHint:
      'Original-XML als Text. Die Eingangsprüfung zeigt die Rechnungsdaten als lesbare Übersicht.',
    structuredValid: 'E-Rechnungsformat erfolgreich validiert',
    structuredInvalid: 'Die E-Rechnung erfordert eine Prüfung',
    structuredHint:
      'Direkt aus der Lieferanten-XML gelesen, ohne KI. Diese Ansicht ist eine Zusammenfassung. Das unveränderte Original enthält alle Zu- und Abschläge, Steuerkategorien, Zahlungsdaten und Referenzen. Technische Validierung bestätigt weder Echtheit noch die Übereinstimmung von PDF-Darstellung und XML.',
    inputInvoiceInvalid:
      'Die E-Rechnung hat die Validierung nicht bestanden. Prüfen Sie das Original und bitten Sie den Lieferanten vor der Freigabe um eine korrigierte Rechnung.',
    inputPdfInvalid: 'Der PDF-Container hat die PDF/A-Validierung nicht bestanden.',
    invalidInvoiceXml:
      'Die XML ist fehlerhaft, unsicher oder nicht unterstützend kodiert. Laden Sie eine UTF-8-Rechnung ohne DTDs oder externe Entitäten hoch.',
    ambiguousInvoiceXml:
      'Die XML enthält mehrdeutige oder doppelte Rechnungsfelder und kann nicht sicher importiert werden.',
    unsupportedInvoiceProfile:
      'Diese XML verwendet ein nicht unterstütztes Profil, einen Dokumenttyp oder eine Steuerkategorie. Unterstützt werden Rechnungen, kaufmännische Gutschriften, Berichtigungen, Teil- und Vorauszahlungsrechnungen. Selbstabrechnungen sind nicht unterstützt.',
    invoiceImportLimit: 'Die Rechnung überschreitet die unterstützten Feld- oder Positionsgrenzen.',
    xmlTooLarge: 'Die Rechnungs-XML überschreitet die Importgrenze von 1 MB.',
    structuredIncomingOnly:
      'Laden Sie diese strukturierte Lieferantenrechnung unter Eingangsrechnungen hoch.',
    selectCustomer: 'Gespeicherten Kunden verwenden',
    customerManual: 'Kundendaten manuell eingeben',
    customerReplaceHint:
      'Die Auswahl ersetzt die Empfängerdaten dieses Entwurfs. Der gespeicherte Kunde bleibt unverändert.',
    saveCustomer:
      'Diese Kundendaten bei der Freigabe des Entwurfs für künftige Rechnungen speichern.',
    customerSaved: 'Diese Kundendaten wurden im Kundenverzeichnis gespeichert.',
    customerInvalid: 'Prüfen Sie Kundenname, Ländercode, USt-IdNr. und E-Mail vor dem Speichern.',
    outgoingIntro: 'Verwalten Sie Entwürfe und validierte Rechnungen Ihres Unternehmens.',
    customersIntro:
      'Speichern Sie Rechnungsadressen für neue Rechnungen. Änderungen wirken sich nicht auf bestehende Entwürfe oder ausgestellte Rechnungen aus.',
    productsIntro:
      'Beschreibungen und Nettopreise in EUR mit regulärer Umsatzsteuer, Nullsteuersatz, Steuerbefreiung oder Reverse Charge speichern. Die Behandlung für jede Rechnung prüfen.',
    importDraft: 'Vorhandenen Entwurf importieren',
    recommended: 'Empfohlen',
    importRecommendedHint:
      'Bereits eine Rechnung als PDF, Bild oder Word-Dokument vorhanden? Importieren Sie diese, um den Entwurf vorauszufüllen. Anschließend die Angaben prüfen und freigeben.',
    viewOutgoing: 'Ausgangsrechnungen ansehen',
    importHint:
      'Importieren Sie nur Rechnungen, die Sie im Namen Ihres Unternehmens ausstellen dürfen.',
    customer: 'Kunde',
    noCustomer: 'Kundendaten im Entwurf eingeben',
    chooseProducts: 'Produkte oder Leistungen hinzufügen (optional)',
    create: 'Entwurf erstellen',
    draftHint:
      'Beim Erstellen wird eine eindeutige TF-Jahr-Nummer reserviert und nie erneut vergeben. Ein Entwurf verbraucht ein Dokument Ihres Tageskontingents. KI und Upload sind nicht erforderlich.',
    numberHint: 'Diese Rechnungsnummer ist reserviert und kann nicht geändert werden.',
    profileLink: 'Firmendaten bearbeiten',
    directoryLink: 'Kunden verwalten',
    save: 'Speichern',
    saving: 'Wird gespeichert…',
    edit: 'Bearbeiten',
    archive: 'Archivieren',
    cancel: 'Abbrechen',
    add: 'Eintrag hinzufügen',
    search: 'Verzeichnis durchsuchen',
    empty: 'Noch keine Einträge. Fügen Sie oben Ihren ersten Eintrag hinzu.',
    limitHint: 'Bis zu 200 Treffer. Suchen Sie gezielt nach älteren Einträgen.',
    readonly: 'Inhaber und Administratoren verwalten dieses Verzeichnis.',
    saved: 'Änderungen gespeichert.',
    archived: 'Eintrag archiviert. Bestehende Rechnungen bleiben unverändert.',
    companyName: 'Rechtlicher Firmenname',
    name: 'Kontaktperson',
    address: 'Straße und Hausnummer',
    postalCode: 'Postleitzahl',
    city: 'Ort',
    country: 'Ländercode',
    vatId: 'USt-IdNr.',
    taxNumber: 'Steuernummer',
    email: 'E-Mail',
    phone: 'Telefon',
    description: 'Beschreibung',
    unitPrice: 'Netto-Einzelpreis (EUR)',
    taxRate: 'Umsatzsteuersatz',
    unitCode: 'Abrechnungseinheit',
    unit: 'Leistung / Einheit',
    piece: 'Stück',
    hour: 'Stunde',
    day: 'Tag',
    month: 'Monat',
    draft: 'Entwurf',
    issued: 'Ausgestellt',
    sent: 'Versendet',
    paid: 'Bezahlt',
    issuedHint:
      'Diese validierte Rechnung ist gesperrt. Sie können sie herunterladen oder das andere unterstützte Format aus denselben freigegebenen Daten erzeugen.',
    markSent: 'Als versendet erfassen',
    markPaid: 'Als bezahlt erfassen',
    trackingHint:
      'Diese Aktionen aktualisieren nur Ihre Aufzeichnungen. Taxful versendet keine E-Mail und zieht keine Zahlung ein.',
    incomingHint:
      'Dies ist eine empfangene Rechnung. Bewahren Sie das Original des Lieferanten auf. Diese Prüfung erstellt oder validiert keine neue E-Rechnung.',
    markReviewed: 'Als geprüft markieren',
    receivedReviewed: 'Original geprüft',
    checkOriginal: 'Ich habe das Original und die erkannten Angaben geprüft.',
    unclassified: 'Rechnungsablauf auswählen',
    classifyHint:
      'Dieser ältere Upload ist noch nicht zugeordnet. Wählen Sie Ausgangsrechnung nur, wenn Sie zur Ausstellung berechtigt sind. Andernfalls bewahren Sie ihn als empfangenes Dokument auf.',
    classifyIncoming: 'Von einem Lieferanten erhalten',
    classifyOutgoing: 'Von meinem Unternehmen ausgestellt',
    manual: 'Manuell erstellter Entwurf',
    manualReview:
      'Prüfen Sie die Rechnung, die Sie ausstellen. Ergänzen Sie die Pflichtfelder, prüfen Sie die Summen und geben Sie den Export frei.',
    manualConfirm:
      'Ich bestätige, dass diese Rechnung vollständig, korrekt und von meinem Unternehmen zur Ausstellung autorisiert ist.',
    summary: 'Erkannte Angaben',
    noData: 'Keine Rechnungsangaben verfügbar. Prüfen Sie das Originaldokument.',
    genericError: 'Die Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.',
    invalidRequest: 'Prüfen Sie die Felder und das aktive Unternehmen.',
    conflict:
      'Der Eintrag wurde geändert oder die Anfrage ist nicht mehr verfügbar. Laden Sie die Seite neu.',
    forbidden: 'Sie sind für diese Aktion nicht berechtigt.',
    dailyLimit: 'Ihr Tageskontingent ist erreicht.',
    monthlyLimit: 'Das monatliche Dokumentenkontingent ist erreicht. Bitten Sie den Eigentümer, den Tarif zu prüfen.',
    workflowRequired: 'Wählen Sie zunächst Eingangs- oder Ausgangsrechnung.',
    invoiceLocked: 'Eine ausgestellte Rechnung kann nicht bearbeitet werden.',
    numberLocked: 'Die reservierte Rechnungsnummer kann nicht geändert werden.',
    numberTaken: 'Diese Rechnungsnummer wird bereits von Ihrem Unternehmen verwendet.',
    invalidState: 'Diese Aktion ist im aktuellen Schritt nicht verfügbar.',
  },
}
