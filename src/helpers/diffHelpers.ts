export function sanitizeForDiff(data: any): any {
    if (!data) return {};

    const result = {...data};

    // Удаляем системные поля
    const systemFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', '__v', '_id'];
    systemFields.forEach(field => delete result[field]);

    // Очищаем чувствительные данные
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    sensitiveFields.forEach(field => {
        if (result[field] !== undefined) {
            result[field] = '***HIDDEN***';
        }
    });

    return result;
}

export function formatChanges(diffObj: any, oldData: any, newData: any): any[] {
    return Object.entries(diffObj).map(([key, value]) => ({
        field: key,
        oldValue: oldData[key],
        newValue: newData[key],
        type: typeof value
    }));
}