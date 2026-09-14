FROM eclipse-temurin:21-jdk-jammy@sha256:8878012b286ef00032346bfbdd55b10e9f5bf923430e3a85c7c3d6e6db6f4605 AS build
WORKDIR /app
ADD --chmod=644 --checksum=sha256:42d7868cb68264874a7b8cab4c3587b03b23ccc7cd72373da917f66758bb9736 https://github.com/ZUGFeRD/mustangproject/releases/download/core-2.26.0/Mustang-CLI-2.26.0.jar /app/mustang.jar
COPY InvoiceService.java /app/
RUN javac -cp mustang.jar InvoiceService.java
# The bundled government-oriented renderer labels every BT-10 as Leitweg-ID.
# Use the general buyer-reference label for this B2B EN16931 export.
RUN jar xf mustang.jar stylesheets/l10n/de.xml && sed -i 's|<entry key="xr:Buyer_reference" id="BT-10">Leitweg-ID</entry>|<entry key="xr:Buyer_reference" id="BT-10">Käuferreferenz</entry>|' stylesheets/l10n/de.xml
FROM eclipse-temurin:21-jre-jammy@sha256:bce52ea7da1f72e6bf5bec505e63b6eb55ba79ad1226903579f77eab1a80139a
WORKDIR /app
COPY --from=build /app/ /app/
COPY logback.xml /app/logback.xml
USER 10001
EXPOSE 8080
ENTRYPOINT ["java","-Xmx768m","-Djava.awt.headless=true","-Dlogback.configurationFile=/app/logback.xml","-Dsun.net.httpserver.maxReqTime=10","-Dsun.net.httpserver.maxRspTime=90","-cp","/app:/app/mustang.jar","InvoiceService"]
