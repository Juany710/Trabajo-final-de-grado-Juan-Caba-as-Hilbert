# FIXIT — Servicio de Reparación On Demand

Plataforma web tipo *marketplace* que conecta clientes con técnicos para solicitar y ofrecer servicios de reparación (electrónica, electrodomésticos, vehículos) en tiempo real, con geolocalización, sistema de ofertas, chat y calificaciones.

- **Autor:** Juany Hilbert (juanyhilbert710@gmail.com)
- **Trabajo Final de Grado**
- **Año:** 2025

## Índice

1. [Descripción del proyecto](#1-descripción-del-proyecto)
2. [Tecnologías utilizadas](#2-tecnologías-utilizadas)
3. [Requisitos previos](#3-requisitos-previos)
4. [Clonar el proyecto](#4-clonar-el-proyecto)
5. [Configurar la base de datos](#5-configurar-la-base-de-datos)
6. [Configuración de la aplicación](#6-configuración-de-la-aplicación)
7. [Ejecutar el backend y el frontend](#7-ejecutar-el-backend-y-el-frontend)
8. [Credenciales de acceso (usuarios de demo)](#8-credenciales-de-acceso-usuarios-de-demo)
9. [Datos de prueba precargados](#9-datos-de-prueba-precargados)
10. [Funcionalidades](#10-funcionalidades)
11. [Flujo recomendado de prueba](#11-flujo-recomendado-de-prueba)
12. [Estructura del proyecto](#12-estructura-del-proyecto)
13. [Arquitectura](#13-arquitectura)
14. [API — Endpoints principales](#14-api--endpoints-principales)
15. [Roles de usuario](#15-roles-de-usuario)
16. [Puertos y URLs importantes](#16-puertos-y-urls-importantes)
17. [Ejecutar los tests](#17-ejecutar-los-tests)
18. [Dependencias que requieren atención](#18-dependencias-que-requieren-atención)
19. [Posibles problemas y soluciones](#19-posibles-problemas-y-soluciones)
20. [Cómo detener la aplicación](#20-cómo-detener-la-aplicación)
21. [Orden correcto de ejecución (resumen rápido)](#21-orden-correcto-de-ejecución-resumen-rápido)
22. [Licencia](#22-licencia)
23. [Observaciones](#23-observaciones)

---

## 1. Descripción del proyecto

FIXIT es una aplicación web que digitaliza el proceso de contratar un servicio de reparación "en el momento" (on demand), similar en concepto a un Uber para técnicos reparadores. Permite:

- Registro y login de **clientes** y **técnicos**.
- Creación de **solicitudes de reparación** por parte del cliente, geolocalizadas en un mapa.
- Envío de **ofertas** por parte de técnicos disponibles (precio, modalidad presencial/remoto, tiempo estimado, garantía).
- Aceptación de ofertas y seguimiento del **servicio** hasta su finalización (con confirmación de ambas partes).
- **Chat en tiempo real** entre cliente y técnico (WebSocket).
- **Calificaciones** bidireccionales al finalizar un servicio.
- Gestión de perfil, direcciones guardadas y disponibilidad del técnico.
- Panel/documentación de API vía Swagger.

## 2. Tecnologías utilizadas

### Backend

- Java 17
- Spring Boot 3.5.15
- Spring Web (API REST)
- Spring Data JPA (Hibernate)
- Spring WebSocket (STOMP + SockJS, chat en tiempo real)
- Spring Security Crypto (hash de contraseñas con BCrypt — no se usa Spring Security completo)
- JWT (`io.jsonwebtoken:jjwt` 0.12.6) para autenticación por token
- springdoc-openapi (Swagger UI) 2.6.0
- Lombok
- Maven (con Maven Wrapper incluido)

### Frontend

- HTML5, CSS3 y JavaScript vanilla (sin framework, sin bundler, sin `npm`)
- Servido como recursos estáticos por el propio Spring Boot (no requiere instalación aparte)
- [Leaflet 1.9.4](https://leafletjs.com/) (vía CDN) para mapas interactivos

### Base de datos

- MySQL 8 (entorno de desarrollo/demo)
- H2 en memoria (usada automáticamente solo para los tests)

### Otros servicios

- Geocodificación mediante la API pública de **Nominatim / OpenStreetMap** (sin API key, requiere conexión a internet)

### Herramientas de desarrollo

- Git
- IntelliJ IDEA / VS Code (indistinto)

## 3. Requisitos previos

Instalar antes de empezar:

- **JDK 17 o superior** ([Eclipse Temurin](https://adoptium.net/) recomendado)
- **MySQL 8** (Server corriendo en `localhost:3306`)
- **Maven 3.9+** (opcional: el proyecto incluye Maven Wrapper, ver sección 7)
- **Git**
- Conexión a internet (necesaria para geocodificación con Nominatim y para el mapa Leaflet vía CDN)

> No se requiere instalar Node.js ni ningún gestor de paquetes de frontend: no hay `package.json`, el frontend es HTML/CSS/JS puro servido por Spring Boot.

## 4. Clonar el proyecto

```bash
git clone <URL-del-repositorio>
cd Trabajo-final-de-grado
```

(O bien: descomprimir el archivo ZIP entregado y abrir una terminal dentro de la carpeta resultante.)

## 5. Configurar la base de datos

**No es necesario crear la base de datos ni ejecutar ningún script SQL manualmente.** La aplicación se conecta a MySQL con la opción `createDatabaseIfNotExist=true`, por lo que la base `fixit_db` se crea sola al arrancar. Tampoco hay migraciones: Hibernate genera y actualiza las tablas automáticamente (`ddl-auto=update`).

Solo hace falta que **MySQL esté instalado y corriendo** en `localhost:3306`, con el usuario por defecto:

- Usuario: `root`
- Contraseña: *(vacía)*

Si tu instalación de MySQL usa una contraseña para `root` (lo habitual), ver la sección 6 para ajustarla.

Al arrancar por primera vez, la aplicación también **carga datos de demo automáticamente** (usuarios, categorías, solicitudes, ofertas, etc. — ver secciones 8 y 9), así que no hace falta cargar nada a mano.

## 6. Configuración de la aplicación

El archivo de configuración es [src/main/resources/application.properties](src/main/resources/application.properties). Ahí se define la conexión a la base de datos, el puerto y el secreto JWT:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/fixit_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=America/Argentina/Cordoba&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
server.port=8080
server.address=0.0.0.0

fixit.jwt.secret=fixit-secret-key-256bits-para-hs256-tesis-2025-seguro
```

Si tu MySQL local tiene otro usuario o contraseña, **editá solamente estas dos líneas** antes de ejecutar el proyecto:

```properties
spring.datasource.username=TU_USUARIO
spring.datasource.password=TU_CONTRASEÑA
```

No es necesario tocar nada más para correr la demo localmente.

## 7. Ejecutar el backend y el frontend

Backend y frontend **se ejecutan juntos con un solo comando**, ya que Spring Boot sirve el frontend estático desde el mismo proceso y puerto.

Desde la raíz del proyecto:

```bash
# Windows (usa el Maven Wrapper incluido, no requiere Maven instalado globalmente)
mvnw.cmd spring-boot:run

# Si tenés Maven instalado globalmente (cualquier SO):
mvn spring-boot:run
```

También se puede compilar y ejecutar el `.jar`:

```bash
mvn clean package
java -jar target/fixit-0.0.1-SNAPSHOT.jar
```

O, desde IntelliJ IDEA / VS Code: abrir el proyecto como Maven project y ejecutar la clase `src/main/java/com/fixit/FixitApplication.java`.

> ⚠️ El archivo `iniciar.bat` de la raíz **no es portable**: tiene rutas absolutas del entorno del autor (JDK, Maven y carpeta del proyecto). Usar directamente `mvn spring-boot:run` como se indica arriba.

Cuando el arranque termina correctamente, en la consola debería verse:

```
FIXIT — Datos de demo cargados correctamente.
   Cliente:  juan@fixit.com   / 123456
   Técnico:  olivia@fixit.com / 123456
   Swagger:  http://localhost:8080/swagger-ui.html
```

Luego, abrir en el navegador:

- **App de cliente:** http://localhost:8080/
- **App de técnico:** http://localhost:8080/tecnico
- **Documentación de la API (Swagger):** http://localhost:8080/swagger-ui.html

## 8. Credenciales de acceso (usuarios de demo)

La contraseña de **todos** los usuarios de prueba es `123456`.

### Clientes

| Nombre | Email | Contraseña |
|-----------------|-------------------|----------|
| Juan Pérez      | `juan@fixit.com`  | `123456` |
| María González  | `maria@fixit.com` | `123456` |
| Lucas Fernández | `lucas@fixit.com` | `123456` |

### Técnicos

| Nombre | Email | Contraseña | Especialidad |
|---------------|--------------------|----------|------------------------|
| Olivia Pérez  | `olivia@fixit.com` | `123456` | Electrónica, Celulares |
| Carlos García | `carlos@fixit.com` | `123456` | Electrodomésticos      |
| Rosana Rojas  | `rosana@fixit.com` | `123456` | Vehículos              |
| Miguel Torres | `miguel@fixit.com` | `123456` | Computadoras           |

No es necesario registrar usuarios nuevos para evaluar la aplicación, aunque el registro también funciona (botón "Registrarse" en la pantalla de login).

## 9. Datos de prueba precargados

Al arrancar por primera vez (tabla `categoria` vacía), la aplicación precarga automáticamente:

- 3 clientes y 4 técnicos (ver sección 8)
- Categorías de reparación (Electrónica, Electrodomésticos, Vehículos, con subtipos como celular, computadora, heladera, lavarropas, auto, moto)
- Solicitudes de reparación en distintos estados (Pendiente, En proceso, Pendiente de confirmación, Finalizada)
- Ofertas asociadas a esas solicitudes
- Servicios y calificaciones de ejemplo
- Mensajes de chat de ejemplo entre cliente y técnico

Esto permite evaluar todo el flujo de la aplicación sin tener que cargar datos manualmente.

## 10. Funcionalidades

- ✔ Registro y login (JWT)
- ✔ Dos roles: Cliente y Técnico (con apps separadas)
- ✔ Creación de solicitudes de reparación con geolocalización
- ✔ Mapa interactivo (Leaflet) con solicitudes/técnicos
- ✔ Envío, aceptación, rechazo y cancelación de ofertas
- ✔ Seguimiento de servicio hasta finalización (con doble confirmación)
- ✔ Chat en tiempo real (WebSocket / STOMP)
- ✔ Calificaciones bidireccionales (cliente ↔ técnico)
- ✔ Gestión de perfil (nombre, contraseña, direcciones guardadas)
- ✔ Disponibilidad y ubicación del técnico
- ✔ Estadísticas básicas (solicitudes finalizadas, stats por cliente)
- ✔ Documentación de API interactiva (Swagger UI)

## 11. Flujo recomendado de prueba

1. Abrir http://localhost:8080/ e iniciar sesión como cliente (`juan@fixit.com` / `123456`).
2. Crear una nueva solicitud de reparación (elegir categoría y ubicación en el mapa).
3. Abrir en otra pestaña/navegador http://localhost:8080/tecnico e iniciar sesión como técnico (`olivia@fixit.com` / `123456`).
4. Como técnico, ver la solicitud pendiente y enviar una oferta.
5. Volver a la pestaña del cliente, revisar la oferta recibida y aceptarla.
6. Probar el chat en tiempo real entre ambas pestañas.
7. Como técnico, marcar el trabajo como finalizado; como cliente, confirmar la finalización.
8. Calificar el servicio desde ambos lados (cliente y técnico).
9. Revisar los endpoints disponibles en http://localhost:8080/swagger-ui.html.

## 12. Estructura del proyecto

```
Trabajo-final-de-grado/
├── pom.xml                              # Configuración Maven (Spring Boot 3.5.15, Java 17)
├── src/main/java/com/fixit/
│   ├── FixitApplication.java            # Clase principal + carga de datos de demo
│   ├── config/
│   │   ├── CorsConfig.java              # CORS abierto + enrutamiento del frontend estático
│   │   └── WebSocketConfig.java         # Configuración STOMP/SockJS (/ws)
│   ├── controller/                      # Controladores REST (Auth, Solicitud, Oferta, Tecnico, Categoria, Calificacion, Chat, Geocode)
│   ├── model/                           # Entidades JPA (Usuario, Cliente, Tecnico, Solicitud, Oferta, Servicio, etc.)
│   ├── repository/                      # Interfaces Spring Data JPA
│   └── service/                         # Lógica de negocio (JwtUtil, ChatService, GeocodingService, OfertaService, SolicitudService)
├── src/main/resources/
│   ├── application.properties           # Configuración (BD, puerto, JWT)
│   └── static/                          # Frontend (HTML/CSS/JS)
│       ├── index.html, css/, js/        # App del cliente
│       ├── tecnico/                     # App del técnico
│       └── img/                         # Imágenes
└── src/test/java/com/fixit/controller/  # Tests (Auth, Oferta, Solicitud)
```

## 13. Arquitectura

Aplicación monolítica: el frontend se sirve desde el mismo proceso Spring Boot que expone la API.

```
Navegador (Cliente / Técnico)
        ↓
Frontend estático (HTML/CSS/JS + Leaflet)
        ↓  HTTP (REST) / WebSocket (STOMP)
Controladores REST (com.fixit.controller)
        ↓
Servicios (com.fixit.service)
        ↓
Repositorios Spring Data JPA (com.fixit.repository)
        ↓
MySQL (fixit_db)
```

La geocodificación de direcciones se resuelve con una llamada externa a la API de Nominatim/OpenStreetMap.

## 14. API — Endpoints principales

Todos los endpoints están bajo el prefijo `/api`. Documentación completa e interactiva en `/swagger-ui.html`.

**Autenticación** (`/api/auth`): `login`, `registro`, `check`, `nombre`, `ubicacion-tecnico`, `direcciones`, `password`

**Solicitudes** (`/api/solicitudes`): crear, `mis-solicitudes`, `mis-trabajos`, `pendientes`, `finalizar`, `cancelar`, `tecnico-finalizo`, estadísticas

**Ofertas** (`/api/ofertas`): crear por solicitud, `mis-ofertas`, `aceptar`, `rechazar`, `cancelar`

**Técnicos** (`/api/tecnicos`): listado, `disponibles`, detalle, `disponibilidad`

**Categorías** (`/api/categorias`): listado, filtro por tipo

**Calificaciones** (`/api/calificaciones`): crear, por usuario, por contexto

**Chat** (`/api/chat`): mensajes con un contacto, envío, listado de contactos

**Geocodificación** (`/api/geocode`): resolución de direcciones

## 15. Roles de usuario

El sistema no tiene un campo "rol" explícito: el tipo de usuario se determina por la tabla asociada al registrarse.

- **Cliente**: crea solicitudes de reparación y contrata técnicos.
- **Técnico**: recibe solicitudes, envía ofertas y realiza los trabajos.
- **Soporte**: entidad definida en el modelo de datos, sin flujo de UI/controlador propio en esta versión.

## 16. Puertos y URLs importantes

| Concepto | Valor |
|---------------------------|---------|
| Puerto de la aplicación 
(backend + frontend)        | `8080` |
| App de cliente            | http://localhost:8080/ |
| App de técnico            | http://localhost:8080/tecnico |
| Swagger UI                | http://localhost:8080/swagger-ui.html |
| WebSocket (chat)          | `ws://localhost:8080/ws` |
| Base de datos             | MySQL, `fixit_db` en `localhost:3306` |
| Usuario MySQL por defecto | `root` (sin contraseña) |

## 17. Ejecutar los tests

Hay tests de integración para los controladores de autenticación, ofertas y solicitudes (usan una base H2 en memoria, no requieren MySQL):

```bash
mvn test
```

## 18. Dependencias que requieren atención

- **Lombok**: se usa en las entidades del modelo; si se abre el proyecto en un IDE, verificar que el plugin de Lombok esté instalado/habilitado para que no marque errores falsos de compilación.
- **Conexión a internet**: necesaria para la geocodificación (Nominatim) y para cargar Leaflet desde su CDN. Sin internet, el mapa y la geocodificación de direcciones no funcionarán, aunque el resto de la app sí.

## 19. Posibles problemas y soluciones

**Error de conexión a MySQL al arrancar**

Verificar que:
- El servicio de MySQL esté iniciado.
- MySQL esté escuchando en el puerto `3306`.
- El usuario y contraseña configurados en `application.properties` coincidan con los de tu instalación de MySQL (por defecto: `root` sin contraseña).

No hace falta crear la base `fixit_db` a mano: se crea sola gracias a `createDatabaseIfNotExist=true`.

**Puerto 8080 ocupado**

Cambiar `server.port` en `application.properties` por otro puerto libre (por ejemplo `8081`).

**El mapa no carga o la geocodificación falla**

Verificar la conexión a internet: tanto Leaflet (CDN) como la geocodificación (Nominatim) requieren acceso externo.

**`mvnw.cmd` no reconocido / da error**

Asegurarse de ejecutarlo desde la raíz del proyecto en una terminal Windows (`cmd` o PowerShell). En Linux/Mac, usar `mvn spring-boot:run` con Maven instalado globalmente (no se incluye wrapper Unix en este repo).

## 20. Cómo detener la aplicación

Presionar `Ctrl + C` en la terminal donde corre `mvn spring-boot:run`, o detener el proceso desde el botón "Stop" del IDE si se ejecutó desde IntelliJ IDEA/VS Code.

## 21. Orden correcto de ejecución (resumen rápido)

1. Instalar JDK 17+.
2. Instalar y arrancar MySQL 8.
3. Clonar el proyecto.
4. (Opcional) Ajustar usuario/contraseña de MySQL en `application.properties`.
5. Ejecutar `mvn spring-boot:run` (o `mvnw.cmd spring-boot:run` en Windows) desde la raíz del proyecto.
6. Esperar el mensaje de consola confirmando que los datos de demo se cargaron.
7. Abrir http://localhost:8080/ en el navegador.
8. Iniciar sesión con `juan@fixit.com` / `123456` (cliente) u `olivia@fixit.com` / `123456` (técnico, en http://localhost:8080/tecnico).

## 22. Licencia

Este proyecto no incluye una licencia formal; fue desarrollado con fines académicos.

## 23. Observaciones

Este proyecto fue desarrollado como Trabajo Final de Grado con fines académicos. La aplicación no requiere configuración adicional para ser evaluada: al ejecutarla, se crea la base de datos automáticamente y se cargan usuarios y datos de prueba listos para usar (ver secciones 8 y 9).

---

**Autor:** Juany Hilbert
**Correo:** juanyhilbert710@gmail.com
