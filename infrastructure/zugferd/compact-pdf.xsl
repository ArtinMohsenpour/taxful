<?xml version="1.0" encoding="UTF-8"?>
<!-- Taxful presentation for the supported standard positive invoice profile.
     Uses Mustang's normalized invoice data and embedded SourceSansPro fonts.
     XML validation and PDF/A generation remain in Mustangproject. -->
<xsl:stylesheet version="2.0" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:xr="urn:ce.eu:en16931:2017:xoev-de:kosit:standard:xrechnung-1">
<xsl:import href="common-xr.xsl"/>
<xsl:param name="foengine"/>
<xsl:output method="xml" encoding="UTF-8"/>
<xsl:template name="money"><xsl:param name="value"/><xsl:value-of select="format-number(number($value), '0.00')"/></xsl:template>
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
   <fo:block font-size="23pt" line-height="28pt" font-weight="bold" color="#52613F" space-after="4pt">Rechnung</fo:block>
   <fo:block font-size="11pt" space-after="12pt"><xsl:value-of select="xr:Invoice_number"/></fo:block>
   <fo:table table-layout="fixed" width="100%" space-after="12pt"><fo:table-column column-width="50%"/><fo:table-column column-width="50%"/><fo:table-body><fo:table-row>
    <fo:table-cell padding-right="12pt"><fo:block><xsl:call-template name="party"><xsl:with-param name="node" select="xr:SELLER"/><xsl:with-param name="label" select="'RECHNUNGSSTELLER'"/></xsl:call-template></fo:block></fo:table-cell>
    <fo:table-cell><fo:block><xsl:call-template name="party"><xsl:with-param name="node" select="xr:BUYER"/><xsl:with-param name="label" select="'RECHNUNGSEMPFÄNGER'"/></xsl:call-template></fo:block></fo:table-cell>
   </fo:table-row></fo:table-body></fo:table>
   <fo:block background-color="#F7F2EB" padding="7pt" space-after="12pt">Rechnungsdatum: <xsl:value-of select="xr:Invoice_issue_date"/> · Leistungsdatum: <xsl:value-of select=".//xr:Actual_delivery_date"/> · Währung: <xsl:value-of select="xr:Invoice_currency_code"/>
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
      <xsl:variable name="tax" select="if ($last) then xs:decimal(../xr:VAT_BREAKDOWN[xs:decimal(xr:VAT_category_rate) = $rate]/xr:VAT_category_tax_amount) - sum(for $line in preceding-sibling::xr:INVOICE_LINE[xs:decimal(.//xr:Invoiced_item_VAT_rate) = $rate] return round(xs:decimal($line/xr:Invoice_line_net_amount) * $rate) div 100) else round($net * $rate) div 100"/>
      <xsl:variable name="unit" select="tokenize(normalize-space(xr:Invoiced_quantity_unit_of_measure_code), ' ')[1]"/>
      <fo:table-row border-bottom="0.5pt solid #E2DBCF">
     <fo:table-cell padding="5pt 3pt" display-align="before"><fo:block><xsl:value-of select="xr:Invoice_line_identifier"/></fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" display-align="before"><fo:block wrap-option="wrap"><xsl:value-of select=".//xr:Item_name"/></fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" display-align="before"><fo:block><xsl:value-of select="format-number(xs:decimal(xr:Invoiced_quantity), '0.##')"/></fo:block><fo:block font-size="7pt" color="#72776C"><xsl:choose><xsl:when test="$unit='C62'">Leistung</xsl:when><xsl:when test="$unit='H87'">Stück</xsl:when><xsl:when test="$unit='HUR'">Std.</xsl:when><xsl:when test="$unit='DAY'">Tag</xsl:when><xsl:when test="$unit='MON'">Monat</xsl:when><xsl:when test="$unit='KGM'">kg</xsl:when><xsl:when test="$unit='MTR'">m</xsl:when><xsl:when test="$unit='LTR'">Liter</xsl:when><xsl:when test="$unit='MTK'">m²</xsl:when><xsl:otherwise><xsl:value-of select="$unit"/></xsl:otherwise></xsl:choose></fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" text-align="right" display-align="before"><fo:block><xsl:call-template name="money"><xsl:with-param name="value" select=".//xr:Item_net_price"/></xsl:call-template></fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" text-align="right" display-align="before"><fo:block><xsl:call-template name="money"><xsl:with-param name="value" select="$net"/></xsl:call-template></fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" text-align="right" display-align="before"><fo:block><xsl:call-template name="money"><xsl:with-param name="value" select="$tax"/></xsl:call-template></fo:block><fo:block font-size="7pt" color="#72776C"><xsl:value-of select="$rate"/>%</fo:block></fo:table-cell>
     <fo:table-cell padding="5pt 3pt" text-align="right" display-align="before"><fo:block><xsl:call-template name="money"><xsl:with-param name="value" select="$net + $tax"/></xsl:call-template></fo:block></fo:table-cell>
    </fo:table-row></xsl:for-each></fo:table-body>
   </fo:table>
   <fo:block keep-together.within-page="always" text-align="right" space-after="12pt">
    <fo:block>Netto: <xsl:call-template name="money"><xsl:with-param name="value" select=".//xr:Invoice_total_amount_without_VAT"/></xsl:call-template><xsl:text> </xsl:text><xsl:value-of select="xr:Invoice_currency_code"/></fo:block>
    <xsl:for-each select="xr:VAT_BREAKDOWN"><fo:block>USt. <xsl:value-of select="xr:VAT_category_rate"/>% auf <xsl:call-template name="money"><xsl:with-param name="value" select="xr:VAT_category_taxable_amount"/></xsl:call-template>: <xsl:call-template name="money"><xsl:with-param name="value" select="xr:VAT_category_tax_amount"/></xsl:call-template></fo:block></xsl:for-each>
    <fo:block font-size="14pt" font-weight="bold" line-height="20pt" color="#52613F" space-before="5pt">Gesamtbetrag: <xsl:call-template name="money"><xsl:with-param name="value" select=".//xr:Invoice_total_amount_with_VAT"/></xsl:call-template><xsl:text> </xsl:text><xsl:value-of select="xr:Invoice_currency_code"/></fo:block>
   </fo:block>
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
