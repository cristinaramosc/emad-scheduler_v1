# Decisions del projecte

## 2026-07-04

Decisió:

L'horari principal és el del grup.

Motiu:

És la vista més utilitzada a l'EMAD.

Conseqüència:

Les vistes de professor i aula es generen a partir dels horaris dels grups.

## 2026-07-04 (compat shim)

Decisió temporal:

Per compatibilitat amb imports existents s'ha afegit un shim `scheduler_engine/__init__.py`
que redirigeix les importacions cap a `backend.scheduler_engine`.

Raó:

La base de codi original utilitza imports amb el prefix `scheduler_engine.*` a
varis llocs i tests. Evitar una refactorització d'imports massiva facilita fer
canvis incrementals sense trencar regressions durant el desenvolupament del
nou domini de `TeachingRequirement`.

Acció futura:

Eliminar aquest shim i unificar l'espai de noms movent `scheduler_engine` al
nível superior o actualitzant els imports a `backend.scheduler_engine`.
Aquesta refactorització s'ha de planificar i executar amb tests i commits petits.