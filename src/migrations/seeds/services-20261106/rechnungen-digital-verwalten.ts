import { sources } from './sources'
import type { ServiceSeed } from './types'

export const rechnungenDigitalVerwalten: ServiceSeed = {
  slug: 'rechnungen-digital-verwalten',
  sortOrder: 60,
  icon: 'team',
  de: {
    title: 'Rechnungen digital verwalten: sicher ablegen, finden und im Team freigeben',
    summary:
      'Alle Ein- und Ausgangsrechnungen an einem Ort: Taxful speichert Originale privat, macht sie durchsuchbar und regelt mit Rollen, wer prüfen, freigeben und exportieren darf.',
    keyPoints: [
      'Getrennte Bereiche für Ein- und Ausgang',
      'Suche, Filter und Vorschau im Browser',
      'Rollen für Inhaber, Admins, Prüfer, Mitglieder',
      'Zwei-Faktor-Anmeldung und Passkeys',
    ],
    seo: {
      title: 'Rechnungen digital verwalten & freigeben | Taxful',
      description:
        'Rechnungen digital verwalten: Originale sicher speichern, schnell finden, im Team prüfen und freigeben – mit Rollen, Zwei-Faktor-Anmeldung und Passkeys.',
    },
    sections: [
      {
        title: 'Schluss mit verstreuten Rechnungen',
        columns: [
          [
            `Rechnungen kommen per E-Mail, als Papier, als PDF und zunehmend als XML-Datei. Sie liegen in Postfächern, Ordnern und auf Schreibtischen, und wer eine bestimmte Rechnung sucht, fragt am Ende die Kollegin. Mit der E-Rechnung wird das nicht einfacher: XML-Dateien lassen sich ohne passende Software weder lesen noch sinnvoll ablegen.

Taxful bündelt Ihre Rechnungen in einem gemeinsamen Unternehmensbereich. Ausgangsrechnungen, Eingangsrechnungen und noch nicht zugeordnete Dokumente haben eigene Ansichten. Jede Datei durchläuft beim Hochladen eine Sicherheitsprüfung. Originale werden unverändert gespeichert, und aus jeder Rechnung ist sichtbar, in welchem Bearbeitungsstand sie sich befindet – von der Prüfung über die Freigabe bis zum Export.

So arbeiten Inhaber, Buchhaltung und Projektverantwortliche mit denselben Daten, ohne Dateien hin- und herzuschicken. Und weil Rollen festlegen, wer was darf, bleibt nachvollziehbar, wer eine Rechnung freigegeben hat.`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'Alles schnell wiederfinden',
        columns: [
          [
            `### Suche und Filter

Suchen Sie nach dem Dateinamen; in Taxful erstellte Rechnungen finden Sie über ihre Rechnungsnummer. Filtern Sie nach Status, Dokumenttyp und Zeitraum; die Ergebnisse sind nach Tagen gruppiert und seitenweise abrufbar.`,
          ],
          [
            `### Vorschau ohne Download

PDF-Dateien, Bilder, Word-Dokumente und XML-Dateien öffnen Sie direkt in der Vorschau. Herunterladen müssen Sie nur, was Sie weitergeben möchten.`,
          ],
          [
            `### Klare Zuordnung

Ausgangs- und Eingangsrechnungen bleiben getrennt. Eingangsrechnungen können nicht versehentlich als eigene Rechnung exportiert werden; ältere Dokumente ordnen Berechtigte ausdrücklich zu.`,
          ],
        ],
      },
      {
        title: 'Rollen und Freigaben im Team',
        tone: 'surface',
        columns: [
          [
            `Jedes Unternehmen in Taxful ist ein eigener Arbeitsbereich mit Mitgliedern und Rollen. Die Berechtigungen werden bei jeder Aktion auf dem Server geprüft, nicht nur in der Oberfläche. Für Freigaben, Exporte und den Download erzeugter Rechnungsdateien ist zusätzlich eine bestätigte Zwei-Faktor-Anmeldung nötig.

- **Mitglieder** laden Dokumente hoch und speichern Rechnungsentwürfe.
- **Prüfer** geben Rechnungen zusätzlich frei und exportieren sie.
- **Administratoren** verwalten Mitglieder und Prüfer, Kunden, Leistungen und das Rechnungsprofil des Unternehmens.
- **Inhaber** verwalten zusätzlich Administratoren und das Abonnement.

Einladungen gelten nur für die eingeladene, bestätigte E-Mail-Adresse. Wie viele Personen mitarbeiten können, hängt von Ihrem Tarif ab.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Sicherheit für Konten und Dateien',
        columns: [
          [
            `### Anmeldung

- Bestätigte E-Mail-Adresse für jedes Konto
- Zwei-Faktor-Anmeldung mit Authenticator-App und einmaligen Wiederherstellungscodes, erforderlich für Freigaben, Exporte und den Download erzeugter Dateien
- Optionale Passkeys mit Bestätigung auf Ihrem Gerät
- Abmeldung anderer Sitzungen und erneute Bestätigung bei sensiblen Aktionen`,
          ],
          [
            `### Dateien

- Private Ablage, nicht öffentlich im Internet abrufbar
- Prüfung auf Schadsoftware vor jeder Verarbeitung
- Downloads nur für berechtigte Mitglieder des jeweiligen Unternehmens
- Exportierte Rechnungen werden unveränderlich gespeichert; Löschen erfordert eine Bestätigung`,
          ],
        ],
      },
      {
        title: 'Wichtig zur Aufbewahrung',
        tone: 'accent',
        columns: [
          [
            `Taxful speichert Originale unverändert und hält ausgestellte Rechnungen fest. Taxful ist aber kein zertifiziertes Archivsystem, und Ihre Aufbewahrungspflichten bleiben bei Ihnen. Ob Ihre Ablage insgesamt den GoBD entspricht, hängt auch von Ihren internen Abläufen und Ihrer Verfahrensdokumentation ab. Gelöschte Dateien werden aus Taxful entfernt; bewahren Sie Unterlagen, die Sie aufbewahren müssen, deshalb nicht ausschließlich in einem Bereich auf, in dem sie gelöscht werden können. Sprechen Sie Ihre Aufbewahrung mit Ihrer Steuerberatung ab.`,
          ],
        ],
      },
      {
        title: 'Rechtlicher Hintergrund zur Aufbewahrung',
        tone: 'surface',
        columns: [
          [
            `- **Originalformat:** E-Rechnungen sind in dem Format aufzubewahren, in dem sie empfangen oder ausgestellt wurden – bei der XRechnung die XML-Datei, bei ZUGFeRD die PDF mit eingebettetem XML.
- **Frist:** Rechnungen gelten als Buchungsbelege und sind in der Regel acht Jahre aufzubewahren ([§ 147 AO](${sources.ao147})).
- **Lesbarkeit:** Die Daten müssen während der gesamten Frist verfügbar und maschinell auswertbar bleiben.

Quellen: [§ 14 UStG](${sources.ustg14}), [§ 147 AO](${sources.ao147}) und die [Fragen und Antworten des Bundesfinanzministeriums](${sources.bmfFaq}). Stand: November 2026.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'So richten Sie Ihren Unternehmensbereich ein',
        tone: 'surface',
        columns: [
          [
            `In wenigen Minuten ist Ihr Unternehmensbereich startklar:

1. **Konto anlegen und E-Mail bestätigen.** Ohne bestätigte E-Mail-Adresse ist keine Anmeldung möglich.
2. **Unternehmensbereich erstellen.** Sie werden Inhaber; Rechnungen, Kunden und Dateien gehören zu diesem Unternehmen und sind für andere Unternehmen nicht sichtbar.
3. **Rechnungsprofil hinterlegen.** Firmenname, Anschrift, Steuernummer oder USt-IdNr., Bankverbindung und Kontaktdaten werden in neue Rechnungen übernommen.
4. **Team einladen.** Laden Sie Kolleginnen und Kollegen per E-Mail ein und vergeben Sie die passende Rolle. Offene Einladungen belegen bereits einen Platz im Tarif.
5. **Anmeldung absichern.** Richten Sie die Zwei-Faktor-Anmeldung ein, die Freigaben und Exporte voraussetzen, und bei Bedarf Passkeys.`,
          ],
          [
            `### Mehrere Unternehmen, klar getrennt

Wenn Sie für mehrere Firmen arbeiten, wechseln Sie zwischen Unternehmensbereichen, ohne sich neu anzumelden. Das ist praktisch für Gründer mit mehreren Gesellschaften oder für Teams, die mehrere Firmen betreuen. Die Daten bleiben dabei strikt getrennt.

Jede Anfrage – Lesen, Ändern, Herunterladen – wird serverseitig gegen Ihre aktuelle Mitgliedschaft geprüft. Verlässt jemand das Team oder ändert sich eine Rolle, gelten die neuen Rechte sofort. Änderungen an Mitgliedern und Rollen werden protokolliert.`,
          ],
        ],
      },
      {
        title: 'Häufige Fragen zur Rechnungsverwaltung',
        columns: [
          [
            {
              faq: [
                {
                  question: 'Wie lange muss ich Rechnungen aufbewahren?',
                  answer:
                    'Rechnungen sind als Buchungsbelege in der Regel acht Jahre aufzubewahren. Die Frist beginnt mit dem Ende des Kalenderjahres. Klären Sie Sonderfälle mit Ihrer Steuerberatung.',
                },
                {
                  question: 'Muss ich bei einer E-Rechnung die XML-Datei aufbewahren?',
                  answer:
                    'Ja. Bei der XRechnung ist die XML-Datei das Original, bei ZUGFeRD die PDF mit eingebettetem XML. Eine ausgedruckte oder nur visuelle Fassung genügt nicht.',
                },
                {
                  question: 'Wer in meinem Team darf Rechnungen freigeben?',
                  answer:
                    'Inhaber, Administratoren und Prüfer. Mitglieder können hochladen und Entwürfe speichern, aber nicht freigeben oder exportieren.',
                },
                {
                  question:
                    'Kann Taxful Rechnungen automatisch aus meinem E-Mail-Postfach übernehmen?',
                  answer:
                    'Nein. Sie laden Rechnungen selbst hoch. Eine Verbindung zu Ihrem E-Mail-Postfach besteht nicht.',
                },
                {
                  question:
                    'Was passiert mit meinen Dateien, wenn ich den Tarif wechsle oder kündige?',
                  answer:
                    'Vorhandene Dateien bleiben zugänglich, auch wenn Sie ein Kontingent überschreiten oder kündigen. Neue Uploads richten sich nach dem jeweils gültigen Tarif.',
                },
                {
                  question: 'Wie schütze ich mein Konto zusätzlich?',
                  answer:
                    'Richten Sie die Zwei-Faktor-Anmeldung mit einer Authenticator-App ein – für Freigaben, Exporte und Downloads erzeugter Dateien ist sie ohnehin erforderlich. Legen Sie die Wiederherstellungscodes sicher ab; danach können Sie zusätzlich Passkeys einrichten.',
                },
                {
                  question: 'Kann ich Dokumente löschen?',
                  answer:
                    'Hochgeladene Dokumente und Entwürfe können die hochladende Person, Inhaber und Administratoren nach einer Bestätigung löschen; dabei werden alle Fassungen des Dokuments entfernt. Ausgestellte Rechnungen lassen sich nicht löschen, und verbrauchte Kontingente werden durch das Löschen nicht zurückgegeben.',
                },
                {
                  question: 'Welche Dateien kann ich in der Vorschau ansehen?',
                  answer:
                    'PDF-Dateien, Bilder, Word-Dokumente als Textansicht und XML-Dateien öffnen Sie direkt im Browser, ohne sie herunterzuladen.',
                },
                {
                  question: 'Sieht mein Team Rechnungen anderer Unternehmen?',
                  answer:
                    'Nein. Jedes Unternehmen ist ein eigener Bereich, und Mitglieder sehen nur die Dokumente der Unternehmen, denen sie angehören.',
                },
              ],
            },
          ],
        ],
      },
      {
        title: 'Passende Leistungen',
        columns: [
          [
            {
              services: [
                'e-rechnung-empfangen',
                'e-rechnung-erstellen',
                'pdf-in-e-rechnung-umwandeln',
              ],
            },
          ],
        ],
      },
      {
        title: 'Rechnungen gemeinsam im Griff',
        tone: 'surface',
        columns: [
          [
            'Laden Sie Ihr Team ein und legen Sie fest, wer prüft und freigibt. [Kostenlos starten](/signup) oder [Tarife vergleichen](/pricing).',
          ],
        ],
      },
    ],
  },
  en: {
    title: 'Manage invoices digitally: store, find and approve as a team',
    summary:
      'All incoming and outgoing invoices in one place: Taxful stores originals privately, makes them searchable and uses roles to control who reviews, approves and exports.',
    keyPoints: [
      'Separate incoming and outgoing areas',
      'Search, filters and in-browser preview',
      'Roles for owners, admins, reviewers, members',
      'Two-factor sign-in and passkeys',
    ],
    seo: {
      title: 'Manage & approve invoices as a team | Taxful',
      description:
        'Manage invoices digitally: store originals securely, find them fast, review and approve as a team – with roles, two-factor sign-in and passkeys.',
    },
    sections: [
      {
        title: 'No more scattered invoices',
        columns: [
          [
            `Invoices arrive by email, on paper, as PDF and increasingly as XML files. They end up in inboxes, folders and on desks, and finding a specific one means asking around. E-invoices do not make this easier: XML files cannot be read or filed sensibly without the right software.

Taxful brings your invoices into one shared company workspace. Outgoing invoices, incoming invoices and unassigned documents have their own views. Every upload passes a security check, originals are stored unchanged, and each invoice shows its status – from review to approval and export.

Owners, bookkeepers and project leads work with the same data without emailing files back and forth, and roles make it clear who approved what.`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'Find everything fast',
        columns: [
          [
            `### Search and filters

Search by file name; invoices created in Taxful are found by their invoice number. Filter by status, document type and date; results are grouped by day and paginated.`,
          ],
          [
            `### Preview without downloading

Open PDFs, images, Word documents and XML files in the preview. Download only what you want to share.`,
          ],
          [
            `### Clear separation

Incoming and outgoing invoices stay apart, so a supplier invoice can never be exported as your own. Older documents are assigned explicitly.`,
          ],
        ],
      },
      {
        title: 'Roles and approvals',
        tone: 'surface',
        columns: [
          [
            `Each company is its own workspace with members and roles. Permissions are enforced on the server for every action, not just hidden in the interface. Approving, exporting and downloading generated invoice files also require a confirmed two-factor sign-in.

- **Members** upload documents and save invoice drafts.
- **Reviewers** can also approve and export invoices.
- **Admins** manage members and reviewers, customers, products and the company invoice profile.
- **Owners** also manage admins and the subscription.

Invitations only work for the invited, verified email address. The number of seats depends on your plan.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Security for accounts and files',
        columns: [
          [
            `### Sign-in

- Verified email address for every account
- Two-factor sign-in with an authenticator app and one-time recovery codes, required to approve, export and download generated files
- Optional passkeys confirmed on your device
- Sign out other sessions; sensitive actions ask you to confirm again`,
          ],
          [
            `### Files

- Private storage, not publicly reachable
- Malware check before any processing
- Downloads only for authorised members of the company
- Exported invoices are stored immutably; deletion requires confirmation`,
          ],
        ],
      },
      {
        title: 'About retention',
        tone: 'accent',
        columns: [
          [
            `Taxful keeps originals unchanged and locks issued invoices, but it is not a certified archiving system and your retention obligations remain yours. Whether your record-keeping meets the German GoBD rules also depends on your internal processes and documentation. Deleted files are removed from Taxful, so do not keep records you must retain only in a place where they can be deleted. Discuss retention with your tax adviser.`,
          ],
        ],
      },
      {
        title: 'Legal background on retention',
        tone: 'surface',
        columns: [
          [
            `- **Original format:** keep e-invoices in the format received or issued – the XML for XRechnung, the PDF with embedded XML for ZUGFeRD.
- **Period:** invoices are accounting records and generally have to be kept for eight years ([Section 147 AO](${sources.ao147})).
- **Readability:** data must stay available and machine-readable for the whole period.

Sources: [Section 147 AO](${sources.ao147}) and the [German Federal Ministry of Finance FAQ](${sources.bmfFaq}). As of November 2026.`,
          ],
        ],
      },
      {
        title: 'Set up your company workspace',
        tone: 'surface',
        columns: [
          [
            `1. **Create an account and verify your email.** Sign-in requires a verified address.
2. **Create a company workspace.** You become its owner; its invoices, customers and files are invisible to other companies.
3. **Add your invoice profile.** Company name, address, tax number or VAT ID, bank details and contact information are added to new invoices.
4. **Invite your team** by email and assign roles. Pending invitations already reserve a seat.
5. **Secure sign-in** with two-factor authentication, which approvals and exports require, and optional passkeys.

Work for several companies? Switch between workspaces without signing in again – their data stays strictly separate, and every request is checked against your current membership on the server.`,
          ],
        ],
      },
      {
        title: 'Frequently asked questions',
        columns: [
          [
            {
              faq: [
                {
                  question: 'How long do I have to keep invoices in Germany?',
                  answer:
                    'Invoices are accounting records and generally have to be kept for eight years from the end of the calendar year. Ask your tax adviser about special cases.',
                },
                {
                  question: 'Do I have to keep the XML file of an e-invoice?',
                  answer:
                    'Yes. For XRechnung the XML file is the original; for ZUGFeRD it is the PDF with embedded XML. A printout or visual copy alone is not enough.',
                },
                {
                  question: 'Who in my team can approve invoices?',
                  answer:
                    'Owners, admins and reviewers. Members can upload and save drafts but cannot approve or export.',
                },
                {
                  question: 'Can Taxful collect invoices from my mailbox?',
                  answer:
                    'No. You upload invoices yourself; Taxful does not connect to your mailbox.',
                },
                {
                  question: 'What happens to my files if I change plan or cancel?',
                  answer:
                    'Existing files stay accessible, even if you exceed an allowance or cancel. New uploads follow your current plan.',
                },
                {
                  question: 'Can I delete documents?',
                  answer:
                    'The uploader, owners and admins can delete uploaded documents and drafts after confirming; all versions are removed. Issued invoices cannot be deleted, and used allowances are not refunded.',
                },
              ],
            },
          ],
        ],
      },
      {
        title: 'Related services',
        columns: [
          [
            {
              services: [
                'e-rechnung-empfangen',
                'e-rechnung-erstellen',
                'pdf-in-e-rechnung-umwandeln',
              ],
            },
          ],
        ],
      },
      {
        title: 'Keep invoices under control together',
        tone: 'surface',
        columns: [
          [
            'Invite your team and decide who reviews and approves. [Start for free](/signup) or [compare plans](/pricing).',
          ],
        ],
      },
    ],
  },
}
