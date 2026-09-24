<?xml version="1.0" encoding="UTF-8"?>
<!-- Taxful presentation for supported invoice and commercial credit profiles.
     Uses Mustang's normalized invoice data and embedded SourceSansPro fonts.
     XML validation and PDF/A generation remain in Mustangproject. -->
<xsl:stylesheet version="2.0" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:xr="urn:ce.eu:en16931:2017:xoev-de:kosit:standard:xrechnung-1">
<xsl:import href="common-xr.xsl"/>
<xsl:param name="foengine"/>
<xsl:output method="xml" encoding="UTF-8"/>
<xsl:template name="money"><xsl:param name="value"/><xsl:value-of select="format-number(number($value), '0.00')"/></xsl:template>
<xsl:template name="tax-label"><xsl:param name="code"/><xsl:choose><xsl:when test="tokenize(normalize-space($code), ' ')[1]='AE'">Reverse Charge</xsl:when><xsl:when test="tokenize(normalize-space($code), ' ')[1]='E'">Steuerbefreit</xsl:when><xsl:when test="tokenize(normalize-space($code), ' ')[1]='Z'">Nullsteuersatz</xsl:when><xsl:otherwise>USt.</xsl:otherwise></xsl:choose></xsl:template>
<xsl:template name="party">
  <xsl:param name="node"/><xsl:param name="label"/>
  <fo:block font-size="8pt" color="#72776C" space-after="4pt"><xsl:value-of select="$label"/></fo:block>
  <fo:block font-weight="bold" font-size="11pt"><xsl:value-of select="$node/*[ends-with(local-name(), '_name')][1]"/></fo:block>
  <xsl:for-each select="$node//*[contains(local-name(), '_address_line_')]">
    <fo:block><xsl:value-of select="."/></fo:block>
  </xsl:for-each>
  <fo:block><xsl:value-of select="$node//*[ends-with(local-name(), '_post_code')]"/><xsl:text> </xsl:text><xsl:value-of select="$node//*[ends-with(local-name(), '_city')]"/></fo:block>
  <fo:block><xsl:value-of select="$node//*[ends-with(local-name(), '_country_code')]"/></fo:block>
  <xsl:for-each select="$node/*[ends-with(local-name(), '_VAT_identifier') or ends-with(local-name(), '_tax_registration_identifier') or ends-with(local-name(), '_electronic_address')]">
    <fo:block font-size="8pt" space-before="2pt"><xsl:choose><xsl:when test="ends-with(local-name(), '_VAT_identifier')">USt-ID: </xsl:when><xsl:when test="ends-with(local-name(), '_tax_registration_identifier')">Steuernummer: </xsl:when><xsl:otherwise>E-Mail: </xsl:otherwise></xsl:choose><xsl:value-of select="."/></fo:block>
  </xsl:for-each>
</xsl:template>
<xsl:template match="xr:invoice">
<fo:root font-family="SourceSansPro" font-size="9pt" line-height="12pt" color="#30372B" language="de">
 <fo:layout-master-set><fo:simple-page-master master-name="invoice" page-width="210mm" page-height="297mm" margin="15mm"><fo:region-body margin-bottom="12mm"/><fo:region-after extent="8mm"/></fo:simple-page-master></fo:layout-master-set>
 <fo:page-sequence master-reference="invoice">
  <fo:static-content flow-name="xsl-region-after"><fo:block font-size="8pt" color="#92998B" border-top="0.5pt solid #E2DBCF" padding-top="4pt" text-align="center">Erstellt mit Taxful · Seite <fo:page-number/> / <fo:page-number-citation-last ref-id="invoice-end"/></fo:block></fo:static-content>
  <fo:flow flow-name="xsl-region-body">
   <fo:block font-size="23pt" line-height="28pt" font-weight="bold" color="#52613F" space-after="4pt"><xsl:choose><xsl:when test="starts-with(xr:Invoice_type_code, '381')">Kaufmännische Gutschrift</xsl:when><xsl:when test="starts-with(xr:Invoice_type_code, '384')">Berichtigte Rechnung</xsl:when><xsl:when test="starts-with(xr:Invoice_type_code, '326')">Teilrechnung</xsl:when><xsl:when test="starts-with(xr:Invoice_type_code, '386')">Vorauszahlungsrechnung</xsl:when><xsl:when test="starts-with(xr:INVOICE_NOTE/xr:Invoice_note, 'Schlussrechnung /')">Schlussrechnung</xsl:when><xsl:otherwise>Rechnung</xsl:otherwise></xsl:choose></fo:block>
   <fo:block font-size="11pt" space-after="12pt"><xsl:value-of select="xr:Invoice_number"/></fo:block>
   <fo:table table-layout="fixed" width="100%" space-after="12pt"><fo:table-column column-width="50%"/><fo:table-column column-width="50%"/><fo:table-body><fo:table-row>
    <fo:table-cell padding-right="12pt"><fo:block><xsl:call-template name="party"><xsl:with-param name="node" select="xr:SELLER"/><xsl:with-param name="label" select="'RECHNUNGSSTELLER'"/></xsl:call-template></fo:block></fo:table-cell>
    <fo:table-cell><fo:block><xsl:call-template name="party"><xsl:with-param name="node" select="xr:BUYER"/><xsl:with-param name="label" select="'RECHNUNGSEMPFÄNGER'"/></xsl:call-template></fo:block></fo:table-cell>
   </fo:table-row></fo:table-body></fo:table>
   <fo:block background-color="#F7F2EB" padding="7pt" space-after="12pt">Rechnungsdatum: <xsl:value-of select="xr:Invoice_issue_date"/><xsl:if test=".//xr:Actual_delivery_date"> · Leistungsdatum: <xsl:value-of select=".//xr:Actual_delivery_date"/></xsl:if> · Währung: <xsl:value-of select="xr:Invoice_currency_code"/>
    <xsl:if test=".//xr:Invoicing_period_start_date"><fo:block>Leistungszeitraum: <xsl:value-of select=".//xr:Invoicing_period_start_date"/> – <xsl:value-of select=".//xr:Invoicing_period_end_date"/></fo:block></xsl:if>
    <xsl:for-each select="xr:PRECEDING_INVOICE_REFERENCE"><fo:block>Bezug auf Rechnung: <xsl:value-of select="xr:Preceding_Invoice_reference"/><xsl:if test="xr:Preceding_Invoice_issue_date"> · <xsl:value-of select="xr:Preceding_Invoice_issue_date"/></xsl:if></fo:block></xsl:for-each>
    <xsl:if test="xr:Buyer_reference"><fo:block>Käuferreferenz: <xsl:value-of select="xr:Buyer_reference"/></fo:block></xsl:if>
   </fo:block>
   <fo:table table-layout="fixed" width="100%" space-after="10pt">
    <fo:table-column column-width="4%"/><fo:table-column column-width="37%"/><fo:table-column column-width="10%"/><fo:table-column column-width="13%"/><fo:table-column column-width="12%"/><fo:table-column column-width="12%"/><fo:table-column column-width="12%"/>
    <fo:table-header><fo:table-row background-color="#EAE2D6" font-size="8pt" font-weight="bold">
     <xsl:for-each select="('Pos.', 'Beschreibung', 'Menge', 'Preis netto', 'Netto', 'USt.', 'Brutto')"><fo:table-cell padding="5pt 3pt" display-align="before"><fo:block text-align="{if (position() ge 4) then 'right' else 'left'}"><xsl:value-of select="."/></fo:block></fo:table-cell></xsl:for-each>
    </fo:table-row></fo:table-header>
    <fo:table-body><xsl:for-each select="xr:INVOICE_LINE">
      <xsl:variable name="rate" select="xs:decimal(.//xr:Invoiced_item_VAT_rate)"/>
      <xsl:variable name="net" select="xs:decimal(xr:Invoice_line_net_amount)"/>
      <xsl:variable name="last" select="not(following-sibling::xr:INVOICE_LINE[xs:decimal(.//xr:Invoiced_item_VAT_rate) = $rate])"/>
      <!-- Allocate only line VAT here; document allowances/charges have their own tax. -->
      <xsl:variable name="tax" select="if ($last) then round(sum(../xr:INVOICE_LINE[xs:decimal(.//xr:Invoiced_item_VAT_rate) = $rate]/xr:Invoice_line_net_amount) * $rate) div 100 - sum(for $line in preceding-sibling::xr:INVOICE_LINE[xs:decimal(.//xr:Invoiced_item_VAT_rate) = $rate] return round(xs:decimal($line/xr:Invoice_line_net_amount) * $rate) div 100) else round($net * $rate) div 100"/>
      <xsl:variable name="unit" select="tokenize(normalize-space(xr:Invoiced_quantity_unit_of_measure_code), ' ')[1]"/>
      <fo:table-row border-bottom="0.5pt solid #E2DBCF">
     <fo:table-cell padding="5pt 3pt" display-align="before"><fo:block><xsl:value-of select="xr:Invoice_line_identifier"/></fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" display-align="before"><fo:block wrap-option="wrap"><xsl:value-of select=".//xr:Item_name"/></fo:block><xsl:for-each select="xr:INVOICE_LINE_ALLOWANCES | xr:INVOICE_LINE_CHARGES"><fo:block font-size="7pt" color="#72776C"><xsl:choose><xsl:when test="self::xr:INVOICE_LINE_ALLOWANCES">Nachlass: −</xsl:when><xsl:otherwise>Zuschlag: +</xsl:otherwise></xsl:choose><xsl:call-template name="money"><xsl:with-param name="value" select="*[ends-with(local-name(), '_amount') and not(contains(local-name(), '_base_'))]"/></xsl:call-template> · <xsl:value-of select="*[ends-with(local-name(), '_reason')]"/></fo:block></xsl:for-each></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" display-align="before"><fo:block><xsl:value-of select="format-number(xs:decimal(xr:Invoiced_quantity), '0.##')"/></fo:block><fo:block font-size="7pt" color="#72776C"><xsl:choose><xsl:when test="$unit='C62'">Leistung</xsl:when><xsl:when test="$unit='H87'">Stück</xsl:when><xsl:when test="$unit='HUR'">Std.</xsl:when><xsl:when test="$unit='DAY'">Tag</xsl:when><xsl:when test="$unit='MON'">Monat</xsl:when><xsl:when test="$unit='KGM'">kg</xsl:when><xsl:when test="$unit='MTR'">m</xsl:when><xsl:when test="$unit='LTR'">Liter</xsl:when><xsl:when test="$unit='MTK'">m²</xsl:when><xsl:otherwise><xsl:value-of select="$unit"/></xsl:otherwise></xsl:choose></fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" text-align="right" display-align="before"><fo:block><xsl:call-template name="money"><xsl:with-param name="value" select=".//xr:Item_net_price"/></xsl:call-template></fo:block><xsl:if test="number(.//xr:Item_price_base_quantity) gt 1"><fo:block font-size="7pt">je <xsl:value-of select=".//xr:Item_price_base_quantity"/></fo:block></xsl:if></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" text-align="right" display-align="before"><fo:block><xsl:call-template name="money"><xsl:with-param name="value" select="$net"/></xsl:call-template></fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" text-align="right" display-align="before"><fo:block><xsl:call-template name="money"><xsl:with-param name="value" select="$tax"/></xsl:call-template></fo:block><fo:block font-size="7pt" color="#72776C"><xsl:value-of select="$rate"/>%<xsl:if test="$rate=0"><fo:block><xsl:call-template name="tax-label"><xsl:with-param name="code" select=".//xr:Invoiced_item_VAT_category_code"/></xsl:call-template></fo:block></xsl:if></fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" text-align="right" display-align="before"><fo:block><xsl:call-template name="money"><xsl:with-param name="value" select="$net + $tax"/></xsl:call-template></fo:block></fo:table-cell>
    </fo:table-row></xsl:for-each></fo:table-body>
   </fo:table>
   <xsl:for-each select="xr:DOCUMENT_LEVEL_ALLOWANCES | xr:DOCUMENT_LEVEL_CHARGES"><fo:block space-after="3pt"><xsl:choose><xsl:when test="self::xr:DOCUMENT_LEVEL_ALLOWANCES">Rechnungsnachlass: −</xsl:when><xsl:otherwise>Rechnungszuschlag: +</xsl:otherwise></xsl:choose><xsl:call-template name="money"><xsl:with-param name="value" select="*[ends-with(local-name(), '_amount') and not(contains(local-name(), '_base_'))]"/></xsl:call-template> · <xsl:value-of select="*[ends-with(local-name(), '_reason')]"/> · USt. <xsl:value-of select="*[ends-with(local-name(), '_VAT_rate')]"/>%</fo:block></xsl:for-each>
   <fo:block keep-together.within-page="always" text-align="right" space-after="12pt">
    <fo:block>Netto: <xsl:call-template name="money"><xsl:with-param name="value" select=".//xr:Invoice_total_amount_without_VAT"/></xsl:call-template><xsl:text> </xsl:text><xsl:value-of select="xr:Invoice_currency_code"/></fo:block>
    <xsl:for-each select="xr:VAT_BREAKDOWN"><fo:block><xsl:call-template name="tax-label"><xsl:with-param name="code" select="xr:VAT_category_code"/></xsl:call-template><xsl:text> </xsl:text><xsl:value-of select="xr:VAT_category_rate"/>% auf <xsl:call-template name="money"><xsl:with-param name="value" select="xr:VAT_category_taxable_amount"/></xsl:call-template>: <xsl:call-template name="money"><xsl:with-param name="value" select="xr:VAT_category_tax_amount"/></xsl:call-template></fo:block></xsl:for-each>
    <fo:block font-size="14pt" font-weight="bold" line-height="20pt" color="#52613F" space-before="5pt">Gesamtbetrag: <xsl:call-template name="money"><xsl:with-param name="value" select=".//xr:Invoice_total_amount_with_VAT"/></xsl:call-template><xsl:text> </xsl:text><xsl:value-of select="xr:Invoice_currency_code"/></fo:block>
    <xsl:if test="number(.//xr:Paid_amount) gt 0"><fo:block>Bereits bezahlt: <xsl:call-template name="money"><xsl:with-param name="value" select=".//xr:Paid_amount"/></xsl:call-template></fo:block></xsl:if>
    <fo:block font-weight="bold"><xsl:choose><xsl:when test="starts-with(xr:Invoice_type_code, '381')">Gutschriftbetrag: </xsl:when><xsl:otherwise>Zahlbetrag: </xsl:otherwise></xsl:choose><xsl:call-template name="money"><xsl:with-param name="value" select=".//xr:Amount_due_for_payment"/></xsl:call-template><xsl:text> </xsl:text><xsl:value-of select="xr:Invoice_currency_code"/></fo:block>
   </fo:block>
   <xsl:for-each select="xr:VAT_BREAKDOWN[xr:VAT_exemption_reason_text]"><fo:block space-after="5pt"><xsl:value-of select="xr:VAT_exemption_reason_text"/></fo:block></xsl:for-each>
   <xsl:for-each select="xr:INVOICE_NOTE/xr:Invoice_note"><fo:block white-space-collapse="false" linefeed-treatment="preserve" space-after="8pt"><xsl:value-of select="."/></fo:block></xsl:for-each>
   <fo:block border-top="0.5pt solid #E2DBCF" padding-top="8pt" font-weight="bold" keep-with-next.within-page="always">Zahlung</fo:block>
   <fo:block><xsl:choose><xsl:when test="starts-with(normalize-space(.//xr:Payment_means_type_code), '58')">SEPA-Überweisung</xsl:when><xsl:otherwise>Barzahlung</xsl:otherwise></xsl:choose></fo:block>
   <xsl:if test="xr:Payment_due_date"><fo:block>Fällig am: <xsl:value-of select="xr:Payment_due_date"/></fo:block></xsl:if>
   <xsl:if test="xr:Payment_terms"><fo:block white-space-collapse="false" linefeed-treatment="preserve"><xsl:value-of select="xr:Payment_terms"/></fo:block></xsl:if>
   <xsl:for-each select=".//xr:Payment_account_identifier"><fo:block>IBAN: <xsl:value-of select="."/></fo:block></xsl:for-each>
   <fo:block id="invoice-end"/>
  </fo:flow>
 </fo:page-sequence>
</fo:root>
</xsl:template>
</xsl:stylesheet>
