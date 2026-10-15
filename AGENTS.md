# Convenciones de desarrollo — TUDOLAR

Estas convenciones orientan el desarrollo previsto de la app y su API. **Requisito** indica una regla que debe cumplirse; **Recomendación**, una práctica que se adopta salvo motivo documentado. No son una lista exhaustiva. Respeta las decisiones y herramientas que se incorporen al repositorio; no añadas dependencias sin necesidad.

## PostgreSQL y PostGIS

- **Requisito** — Trata PostgreSQL como fuente de verdad para los datos persistentes y las invariantes del negocio. Las validaciones del cliente no sustituyen las validaciones del servidor ni las restricciones de base de datos.
- **Requisito** — Cambia el esquema solo mediante migraciones explícitas, revisables y compatibles con los entornos existentes. Incluye una estrategia de despliegue/recuperación cuando corresponda; no edites manualmente el esquema de producción.
- **Recomendación inicial** — Mientras el acceso a datos sea SQL-first y no se haya elegido ORM, usa `node-pg-migrate` como único runner de migraciones PostgreSQL. Permite migraciones TypeScript/JavaScript o SQL, lo que resulta adecuado para extensiones y objetos propios de PostgreSQL/PostGIS. Confirma su requisito de versión de Node.js al inicializar el backend.
- **Requisito** — Mantén un solo sistema de migraciones como fuente de verdad. Si luego se elige un ORM con migraciones propias, decide explícitamente si se migra a ese sistema; no ejecutes dos runners que administren el mismo esquema. Desactiva la sincronización automática de esquema en entornos compartidos o de producción.
- **Requisito** — Define tipos adecuados y restricciones `NOT NULL`, `CHECK`, `FOREIGN KEY` y `UNIQUE` donde correspondan. No dependas solo de la aplicación para integridad referencial, unicidad o invariantes que la base pueda garantizar.
- **Requisito** — Usa consultas parametrizadas para valores SQL; nunca interpolar entradas no confiables en SQL. Para identificadores u opciones que no admitan parámetros, usa una lista permitida explícita.
- **Requisito** — Guarda importes con `numeric`/decimal o enteros en la unidad menor definida por el dominio; nunca uses punto flotante binario para cálculos monetarios. Define escala, redondeo y moneda explícitamente.
- **Requisito** — Mantén cada transacción acotada a una operación de negocio atómica; no la mantengas abierta durante llamadas de red o trabajo lento. Define límites e invariantes dentro de la transacción para prevenir escrituras parciales y carreras.
- **Requisito** — Revisa los índices para cada patrón importante de consulta (filtros, joins, ordenamiento y restricciones de unicidad). Añade índices que apoyen consultas reales, frecuentes o críticas, y comprueba su utilidad con estadísticas y planes de consulta representativos. No indexes todas las columnas indiscriminadamente: los índices consumen almacenamiento y agregan coste de escritura; una lectura secuencial puede ser el plan correcto.
- **Requisito** — Antes de dar por optimizada una consulta crítica, revisa su SQL, volumen esperado, cardinalidad y plan con `EXPLAIN`; usa `EXPLAIN ANALYZE` en datos de prueba representativos cuando sea seguro, recordando que ejecuta la consulta. No fuerces el uso de un índice sin evidencia.
- **Requisito** — Pagina colecciones, limita el tamaño de página y aplica orden estable. Usa cursor cuando el volumen o la consistencia lo justifiquen. Evita consultas N+1 y lecturas ilimitadas; resuelve relaciones en lotes o con joins adecuados al caso.
- **Requisito** — Para búsquedas de proximidad, mantén SRID coherentes y entiende las unidades: `geometry` usa las unidades de su referencia; `geography` expresa distancia en metros. Usa `ST_DWithin` para filtrar proximidad e índices espaciales GiST adecuados; confirma el plan con consultas representativas.
- **Requisito** — Aplica mínimo privilegio por entorno y servicio; no uses credenciales administrativas desde la aplicación. Mantén secretos fuera del repositorio y usa el mecanismo aprobado para cada entorno.
- **Requisito** — Define copias de seguridad, retención y restauración para datos relevantes; verifica periódicamente la restauración, no solo la creación del backup. Recoge datos personales con propósito, acceso y plazo de retención definidos; elimina o anonimiza cuando corresponda.

## Node.js y NestJS — arquitectura hexagonal

- **Requisito** — Mantén el dominio independiente de NestJS, HTTP, PostgreSQL/ORM y proveedores externos. Las dependencias apuntan hacia el dominio y la aplicación; los detalles de infraestructura implementan contratos definidos hacia adentro.
- **Recomendación** — Organiza por módulos de negocio/contextos y, dentro de cada módulo, separa responsabilidades por capas. Estructura orientativa:
  - `domain/`: modelos de dominio, value objects, invariantes y servicios de dominio; sin dependencias de infraestructura.
  - `application/`: casos de uso/servicios de aplicación y puertos (interfaces) requeridos por esos casos.
  - `adapters/in/`: controladores HTTP, DTOs y otros puntos de entrada; convierten protocolos y delegan en casos de uso.
  - `adapters/out/` o `infrastructure/`: implementaciones de puertos, como repositorios PostgreSQL, mapas, mensajería y servicios externos.
  - `module.ts`: composición de NestJS e inyección que conecta puertos con adaptadores.
  Adapta nombres y granularidad al tamaño del módulo; evita crear capas vacías o ceremoniales.
- **Requisito** — Define puertos de repositorio cerca de la aplicación/dominio que los necesita e implementaciones concretas en infraestructura. Los casos de uso dependen de interfaces, no de ORM, SQL, modelos de persistencia ni de repositorios concretos.
- **Requisito** — Distingue modelos de dominio de entidades/modelos de persistencia y DTOs HTTP cuando sus responsabilidades o ciclos de cambio sean distintos. Usa mappers en los límites; no expongas entidades ORM directamente por la API.
- **Requisito** — Los controladores son adaptadores delgados: validan/transforman la entrada de transporte, llaman un caso de uso y mapean su resultado a una respuesta. No contienen reglas de negocio ni acceden directamente a la base de datos.
- **Requisito** — Los casos de uso coordinan una acción de aplicación y sus puertos. Mantén las invariantes de negocio en el dominio o en el caso de uso adecuado, no duplicadas entre controladores, repositorios y servicios.
- **Requisito** — Usa DTOs de entrada y validación estricta de tipos, rangos y formatos. En NestJS configura `ValidationPipe` con `whitelist: true` y `forbidNonWhitelisted: true` cuando se use `class-validator`; no confíes en tipos declarados por el cliente.
- **Requisito** — Autentica al usuario y autoriza cada operación sobre cada recurso, incluidos identificadores de URL/cuerpo. Comprueba propiedad, ámbito y permiso en servidor; autenticación no implica autorización.
- **Requisito** — Valida la configuración al iniciar. Si faltan variables o son inválidas, falla el arranque con un error claro, sin imprimir secretos.
- **Requisito** — Establece límites HTTP proporcionados al riesgo: tasa de solicitudes, tamaño de payload y tiempos de espera. Configura Helmet y CORS según clientes y orígenes realmente permitidos.
- **Requisito** — Devuelve errores controlados que no expongan stack traces, consultas, secretos ni datos personales innecesarios. Registra información útil para diagnóstico con acceso y retención apropiados, evitando credenciales y tokens.
- **Requisito** — No bloquees el event loop con cálculos, expresiones regulares o procesamiento síncrono costoso. Limita el coste por solicitud y delega trabajo pesado si el caso lo requiere.
- **Recomendación** — Cubre reglas de dominio y casos de uso con pruebas unitarias; prueba adaptadores/repositorios con integración contra PostgreSQL; añade pruebas e2e para flujos HTTP, autorización y fallos críticos.
- **Requisito** — Verifica dependencias y cambios de versión antes de incorporarlos; conserva y sincroniza el lockfile del gestor adoptado. No añadas gestores o librerías por convención.

## React

- **Requisito** — Mantén los componentes de presentación enfocados en representar UI, componer componentes y conectar eventos con acciones. No coloques reglas de negocio ni cálculos de dominio dentro del cuerpo del componente o del JSX.
- **Requisito** — Extrae la lógica de negocio requerida por la UI en funciones puras/utilidades de dominio o en casos de uso de frontend, fuera de los componentes. Los componentes consumen resultados y delegan acciones; no reimplementan reglas del backend como autoridad.
- **Requisito** — Usa Hooks personalizados para lógica que necesita capacidades de React (estado, contexto, ciclo de sincronización o composición de Hooks). No conviertas automáticamente toda lógica de negocio en un Hook: las funciones puras deben seguir siendo independientes de React y fáciles de probar.
- **Requisito** — Sigue las reglas de React: render puro, props/estado inmutables y Hooks llamados solo al nivel superior de componentes u otros Hooks. No llames componentes como funciones ordinarias.
- **Requisito** — No uses Effects para calcular datos derivados ni para ejecutar acciones causadas por un evento del usuario. Calcula datos de vista derivados de forma pura y maneja acciones en sus handlers/casos de uso; reserva Effects para sincronizar con sistemas externos.
- **Requisito** — Evita estado redundante, duplicado o contradictorio. Mantén juntas las piezas que cambian como unidad y deriva valores calculables en vez de sincronizarlos con estado adicional.
- **Requisito** — Diseña interfaces accesibles y comunica estados de carga, error y ausencia de resultados; ofrece acciones de recuperación. Conserva etiquetas, semántica, foco y alternativas para interacción no visual.
- **Recomendación** — Usa TypeScript y componentes reutilizables cuando el proyecto lo haya adoptado y la reutilización sea real. Prefiere interfaces pequeñas; no abstraigas prematuramente.

## React Native (producto móvil previsto)

- **Requisito** — No guardes tokens, claves ni secretos en almacenamiento no seguro ni los incluyas en el bundle. Al elegir persistencia sensible, usa una solución segura aprobada para las plataformas y el proyecto; no presupongas una librería antes de seleccionarla.
- **Requisito** — Solicita permisos solo cuando una función los necesite, explica su uso y contempla denegación o revocación sin bloquear innecesariamente la app.
- **Requisito** — Haz explícitos los estados sin conexión, sincronización pendiente y error de red. No presentes escrituras locales como confirmadas por el servidor; define qué datos persisten offline y cómo se resuelven reintentos o conflictos.

## Fuentes primarias

Consulta estas referencias para ampliar o verificar las convenciones; no reemplazan el análisis de cada cambio.

- **NestJS:** [validación](https://docs.nestjs.com/application/validation), [configuración](https://docs.nestjs.com/application/configuration), [autenticación](https://docs.nestjs.com/security/authentication), [autorización](https://docs.nestjs.com/security/authorization), [limitación de tasa](https://docs.nestjs.com/security/rate-limiting), [pruebas](https://docs.nestjs.com/fundamentals/testing).
- **Node.js:** [prácticas de seguridad](https://nodejs.org/learn/getting-started/security-best-practices), [no bloquear el event loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop).
- **PostgreSQL:** [restricciones](https://www.postgresql.org/docs/current/ddl-constraints.html), [EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html), [índices](https://www.postgresql.org/docs/current/indexes-intro.html), [examinar uso de índices](https://www.postgresql.org/docs/current/indexes-examine.html).
- **PostGIS:** [consultas espaciales](https://postgis.net/docs/using_postgis_query.html), [ST_DWithin](https://postgis.net/docs/ST_DWithin.html).
- **Migraciones:** [node-pg-migrate](https://salsita.github.io/node-pg-migrate/), [migraciones en NestJS/TypeORM](https://docs.nestjs.com/techniques/database).
- **OWASP:** [seguridad de bases de datos](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html), [prevención de inyección SQL](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).
- **React:** [reglas de React](https://react.dev/reference/rules), [reutilizar lógica con Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), [estructura del estado](https://react.dev/learn/choosing-the-state-structure), [cuándo no hace falta un Effect](https://react.dev/learn/you-might-not-need-an-effect).
- **React Native:** [seguridad](https://reactnative.dev/docs/security).
