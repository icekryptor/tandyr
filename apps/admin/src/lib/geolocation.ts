/**
 * Promisified navigator.geolocation.getCurrentPosition with Russian
 * error messages. Web equivalent of expo-location's High accuracy mode.
 */
export function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Геолокация не поддерживается этим браузером.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error('Доступ к геолокации запрещён. Разрешите в настройках браузера.'));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error('Не удалось определить местоположение.'));
            break;
          case err.TIMEOUT:
            reject(new Error('Время определения местоположения истекло.'));
            break;
          default:
            reject(new Error('Не удалось определить местоположение.'));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}
