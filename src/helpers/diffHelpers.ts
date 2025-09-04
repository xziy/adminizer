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

export function formatChanges(diffObj: any, oldData: any, newData: any, operation?: 'add' | 'remove' | 'update'): any[] {
    const changes = [];

    // Специальная обработка для операции добавления
    if (operation === 'add') {
        for (const [key, value] of Object.entries(newData)) {
            if (value === '***HIDDEN***') continue;

            changes.push({
                field: key,
                oldValue: undefined,
                newValue: value,
                type: typeof value,
                operation: 'add'
            });
        }
        return changes;
    }

    // Стандартная обработка для remove и update
    for (const [key, value] of Object.entries(diffObj)) {
        // Для добавленных полей (когда oldData[key] undefined)
        if (oldData[key] === undefined && newData[key] !== undefined) {
            changes.push({
                field: key,
                oldValue: undefined,
                newValue: newData[key],
                type: 'added',
                operation: 'add'
            });
        }
        // Для удаленных полей (когда newData[key] undefined)
        else if (newData[key] === undefined && oldData[key] !== undefined) {
            changes.push({
                field: key,
                oldValue: oldData[key],
                newValue: undefined,
                type: 'deleted',
                operation: 'remove'
            });
        }
        // Для измененных полей
        else {
            changes.push({
                field: key,
                oldValue: oldData[key],
                newValue: newData[key],
                type: typeof value,
                operation: 'update'
            });
        }
    }

    return changes;
}