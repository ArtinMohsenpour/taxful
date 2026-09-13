FROM busybox:1.37@sha256:9db7b59979c38555a39def84a31fb98b5296952f9e3afd4f6f11f05b07adfab0 AS rules
ADD --checksum=sha256:2530cd107c414511c5d0462ec10f886910395abfca820db82e83d70bf01221a8 https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-08-31/xrechnung-3.0.2-validator-configuration-2026-08-31.zip /rules.zip
RUN mkdir /rules && unzip -q /rules.zip -d /rules
FROM eclipse-temurin:21-jre-jammy@sha256:bce52ea7da1f72e6bf5bec505e63b6eb55ba79ad1226903579f77eab1a80139a
WORKDIR /validator
ADD --chmod=644 --checksum=sha256:799e64befca97d4080e03608c80b85dd5a5ecc5f4ae4f35d1116ec2855b9a7c9 https://github.com/itplr-kosit/validator/releases/download/v1.6.3/validator-1.6.3-standalone.jar /validator/validator.jar
COPY --from=rules /rules /validator
USER 10001
EXPOSE 8080
ENTRYPOINT ["java","-Xmx512m","-jar","/validator/validator.jar","-s","/validator/scenarios.xml","-r","/validator","-D","-H","0.0.0.0","-P","8080","--disable-gui"]
