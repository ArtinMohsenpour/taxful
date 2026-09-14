import com.sun.net.httpserver.HttpServer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import org.mustangproject.ZUGFeRD.*;
import org.mustangproject.validator.*;

public class InvoiceService {
  private static final ObjectMapper JSON = new ObjectMapper();
  private static final Semaphore CAPACITY = new Semaphore(1);
  private static String hash(byte[] bytes) throws Exception {
    return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
  }
  public static void main(String[] args) throws Exception {
    HttpServer server = HttpServer.create(new InetSocketAddress(8080), 8);
    server.setExecutor(Executors.newFixedThreadPool(2));
    server.createContext("/health", exchange -> {
      byte[] body="Mustangproject 2.26.0".getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(200,body.length);
      exchange.getResponseBody().write(body); exchange.close();
    });
    server.createContext("/generate", exchange -> {
      boolean acquired=CAPACITY.tryAcquire();
      try {
        if(!acquired) { exchange.sendResponseHeaders(503,-1); return; }
        if(!exchange.getRequestMethod().equals("POST")) { exchange.sendResponseHeaders(405,-1); return; }
        byte[] xml=exchange.getRequestBody().readNBytes(500001);
        String text=new String(xml,StandardCharsets.UTF_8);
        if(xml.length>500000 || text.toUpperCase(Locale.ROOT).contains("<!DOCTYPE") || text.toUpperCase(Locale.ROOT).contains("<!ENTITY")) {
          exchange.sendResponseHeaders(400,-1); return;
        }
        ZUGFeRDValidator xmlValidator=new ZUGFeRDValidator();
        String xmlReport=xmlValidator.validate(xml,"factur-x.xml");
        if(!xmlValidator.wasCompletelyValid()) {
          byte[] body=JSON.writeValueAsBytes(Map.of("valid",false,"report",xmlReport));
          exchange.getResponseHeaders().set("Content-Type","application/json");
          exchange.sendResponseHeaders(422,body.length); exchange.getResponseBody().write(body); return;
        }
        byte[] visual=new ZUGFeRDVisualizer().toPDF(text, ZUGFeRDVisualizer.Language.DE);
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        try(ZUGFeRDExporterFromA3 exporter=new ZUGFeRDExporterFromA3()) {
          exporter.load(visual).setProfile("EN16931").setCreator("Taxful").setProducer("Taxful / Mustangproject 2.26.0").setXML(xml);
          exporter.export(out);
        }
        byte[] pdf=out.toByteArray();
        // Independently check the PDF container; the combined validator's boolean
        // must not be assumed to include the earlier PDF validity result.
        ValidationContext context=new ValidationContext(null);
        PDFValidator pdfValidator=new PDFValidator(context);
        pdfValidator.setFilenameAndContents("invoice.pdf",pdf);
        pdfValidator.validate();
        boolean pdfValid=context.isValid() && text.equals(pdfValidator.getRawXML());
        ZUGFeRDValidator combined=new ZUGFeRDValidator();
        String report=combined.validate(pdf,"invoice.pdf");
        boolean valid=pdfValid && combined.wasCompletelyValid();
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("valid",valid); result.put("pdfValid",pdfValid);
        result.put("xmlValid",combined.wasCompletelyValid()); result.put("report",report);
        result.put("inputSha256",hash(xml)); result.put("pdfSha256",hash(pdf));
        result.put("validator","Mustangproject 2.26.0 / bundled veraPDF / EN16931");
        if(valid)result.put("pdf",Base64.getEncoder().encodeToString(pdf));
        byte[] body=JSON.writeValueAsBytes(result);
        exchange.getResponseHeaders().set("Content-Type","application/json");
        exchange.sendResponseHeaders(valid?200:422,body.length); exchange.getResponseBody().write(body);
      } catch(Exception error) {
        exchange.sendResponseHeaders(500,-1);
      } finally {if(acquired)CAPACITY.release();exchange.close();}
    });
    server.start();
  }
}
