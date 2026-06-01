# Configuración de Firebase (Fine Shine)

La app usa **Firebase Auth**, **Cloud Firestore** y **Firebase Storage** con el SDK web modular (v9+).

## 1. Proyecto en Firebase Console

1. Entra a [Firebase Console](https://console.firebase.google.com/).
2. Abre el proyecto **detailospro** (o crea uno nuevo).
3. En **Build** activa:
   - **Authentication** → método **Email/Password**
   - **Firestore Database** → crea base en modo producción (región cercana, p. ej. `australia-southeast1`)
   - **Storage** → crea bucket por defecto

## 2. App web y variables de entorno

1. **Project settings** (engranaje) → **Your apps** → **Add app** → **Web** (`</>`).
2. Copia el objeto `firebaseConfig` y rellena `.env` en la raíz del repo:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
EXPO_PUBLIC_ADMIN_EMAILS=admin@fineshine.com.au,otro@empresa.com
```

`EXPO_PUBLIC_ADMIN_EMAILS` es una lista separada por comas. Esos correos reciben rol **admin** al iniciar sesión (pestaña Admin, exportar CSV/Excel y PDF).

3. Reinicia Metro después de cambiar `.env`:

```bash
npm run start:clear
```

## 3. Usuarios de prueba (Auth)

1. **Authentication** → **Sign-in method** → activa **Email/Password**.
2. **Users** → **Add user** → crea correo y contraseña para los operarios.

## 4. Reglas de Firestore

**Firestore** → **Rules** → pega y publica:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create, update: if request.auth != null && request.auth.uid == userId;
    }

    match /vehicles/{vehicleId} {
      allow read: if request.auth != null
        && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null
        && (resource.data.userId == request.auth.uid || isAdmin());
    }
  }
}
```

También puedes asignar admin manualmente en Firestore: colección `users` → documento `{uid}` → campo `role: "admin"`.

**Importante:** publica las reglas del archivo `firebase/firestore.rules` en la consola (incluye la colección `users`). Sin eso, el perfil no se guarda en Firestore, pero el admin por email en `.env` sigue funcionando.

Después de cambiar `.env`, reinicia Metro:

```bash
npm run start:clear
```

## 5. Reglas de Storage

**Storage** → **Rules** → pega y publica:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /vehicles/{userId}/{vehicleId}/{fileName} {
      function isAdmin() {
        return request.auth != null
          && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
      }
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Las fotos se guardan en: `vehicles/{uid}/{vehicleId}/{timestamp}-{index}.jpg`

## 6. EAS Build (APK / producción)

Las variables `EXPO_PUBLIC_*` deben existir en EAS:

```bash
npx eas env:push --environment preview --path .env
```

Comprueba:

```bash
npx eas env:list --environment preview
```

## 7. Catálogo (modelos, colores, tipos)

Documento Firestore: **`config/vehicle-catalog`**

```json
{
  "models": ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
  "colors": ["Pearl White Multi-Coat", "Solid Black", "..."],
  "types": [
    { "value": "nuevo", "label": "New" },
    { "value": "usado", "label": "Used" },
    { "value": "redetailing", "label": "Redetailing" }
  ]
}
```

- Crea el documento manualmente en la consola o deja que un **admin** lo cree.
- Si no existe, la app usa valores por defecto (los de arriba).
- Publica las reglas de `firebase/firestore.rules` (incluye lectura de `config` para usuarios autenticados).

## 8. Estructura de datos

Colección **`vehicles`** (documento por inspección):

| Campo        | Tipo     | Descripción                          |
|-------------|----------|--------------------------------------|
| userId      | string   | UID de Auth (dueño del registro)     |
| createdByEmail | string | Email del operario que creó el registro |
| vin         | string   | VIN escaneado                        |
| model       | string   | Modelo Tesla                         |
| type        | string   | `nuevo` \| `usado` \| `redetailing`  |
| status      | string   | `pendiente`, etc.                    |
| color       | string   | Color Tesla                          |
| comments    | string   | Comentarios                          |
| imagesUrls  | string[] | URLs públicas de descarga (Storage)  |
| createdAt   | timestamp / ISO | Fecha y hora exacta de creación |
| createdAtIso | string (ISO) | Hora local exacta al guardar |
| updatedAt   | timestamp / ISO | Última modificación (si aplica) |

## 9. Comprobar en la app

1. Inicia sesión con un usuario de Auth.
2. Escanea un VIN y adjunta fotos.
3. En Firebase Console:
   - **Firestore** → colección `vehicles` → nuevo documento
   - **Storage** → carpeta `vehicles/{tu-uid}/...` → archivos de imagen

## 10. Errores frecuentes

| Error | Solución |
|-------|----------|
| `permission-denied` | Revisa reglas y que el usuario esté logueado |
| `Firebase is not configured` | Completa `.env` o `eas env:push` |
| El dashboard no muestra registros nuevos | Revisa reglas Firestore y que `userId` coincida con el UID del login |
| `storage/unauthorized` | Reglas de Storage y mismo `userId` en la ruta |
