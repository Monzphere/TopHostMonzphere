/*
** Copyright (C) 2001-2024 Zabbix SIA
**
** This program is free software: you can redistribute it and/or modify it under the terms of
** the GNU Affero General Public License as published by the Free Software Foundation, version 3.
**
** This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
** without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
** See the GNU Affero General Public License for more details.
**
** You should have received a copy of the GNU Affero General Public License along with this program.
** If not, see <https://www.gnu.org/licenses/>.
**/


class CWidgetTopHostsMonzphere extends CWidget {

	/**
	 * Table body of top hosts.
	 *
	 * @type {HTMLElement|null}
	 */
	#table_body = null;

	/**
	 * ID of selected host.
	 *
	 * @type {string}
	 */
	#selected_host_id = '';

	#current_sort = {
		column: null,
		order: 'asc'
	};

	setContents(response) {
		super.setContents(response);

		this.#table_body = this._contents.querySelector(`.${ZBX_STYLE_LIST_TABLE} tbody`);

		if (this.#table_body !== null) {
			if (this.#selected_host_id !== '') {
				const row = this.#table_body.querySelector(`tr[data-hostid="${this.#selected_host_id}"]`);

				if (row !== null) {
					this.#selectHost();
				}
				else {
					this.#selected_host_id = '';
				}
			}

			this.#table_body.addEventListener('click', e => this.#onTableBodyClick(e));
			
			// Adiciona listener para os headers da tabela
			const headers = this._contents.querySelectorAll('.sortable');
			headers.forEach(header => {
				header.addEventListener('click', e => this.#onHeaderClick(e));
			});
		}
	}

	#selectHost() {
		const rows = this.#table_body.querySelectorAll('tr[data-hostid]');

		for (const row of rows) {
			row.classList.toggle(ZBX_STYLE_ROW_SELECTED, row.dataset.hostid === this.#selected_host_id);
		}
	}

	#onTableBodyClick(e) {
		if (e.target.closest('a') !== null || e.target.closest('[data-hintbox="1"]') !== null) {
			return;
		}

		const row = e.target.closest('tr');

		if (row !== null) {
			const hostid = row.dataset.hostid;

			if (hostid !== undefined) {
				this.#selected_host_id = hostid;

				this.#selectHost();

				this.broadcast({
					[CWidgetsData.DATA_TYPE_HOST_ID]: [hostid],
					[CWidgetsData.DATA_TYPE_HOST_IDS]: [hostid]
				});
			}
		}
	}

	#onHeaderClick(e) {
		const header = e.currentTarget;
		const column = header.getAttribute('data-column');

		// Inverte a ordem se clicar na mesma coluna
		if (this.#current_sort.column === column) {
			this.#current_sort.order = this.#current_sort.order === 'asc' ? 'desc' : 'asc';
		}
		else {
			this.#current_sort.column = column;
			this.#current_sort.order = 'asc';
		}

		// Remove classes de ordenação de todos os headers
		this._contents.querySelectorAll('.sortable').forEach(h => {
			h.classList.remove('sort-asc', 'sort-desc');
		});

		// Adiciona classe de ordenação ao header atual
		header.classList.add(`sort-${this.#current_sort.order}`);

		this.#sortTable(column, this.#current_sort.order);
	}

	#sortTable(column, order) {
		const rows = Array.from(this.#table_body.querySelectorAll('tr'));
		
		rows.sort((a, b) => {
			let valueA = this.#getCellValue(a, column);
			let valueB = this.#getCellValue(b, column);

			// Converte para número se possível
			if (!isNaN(valueA) && !isNaN(valueB)) {
				valueA = parseFloat(valueA);
				valueB = parseFloat(valueB);
			}

			if (order === 'asc') {
				return valueA > valueB ? 1 : -1;
			}
			else {
				return valueA < valueB ? 1 : -1;
			}
		});

		// Reordena as linhas na tabela
		rows.forEach(row => this.#table_body.appendChild(row));
	}

	#getCellValue(row, column) {
		// Ajusta o índice da coluna para displays em barra que usam 2 colunas
		const cells = row.cells;
		let adjustedColumn = parseInt(column);
		let currentColumn = 0;
		let actualIndex = 0;

		// Percorre as células para encontrar o índice correto
		while (currentColumn < adjustedColumn && actualIndex < cells.length) {
			const colspan = cells[actualIndex].colSpan || 1;
			currentColumn += 1;
			actualIndex += colspan;
		}

		const cell = cells[actualIndex];
		
		if (!cell) {
			return '';
		}

		// Tenta obter o valor numérico do hint
		const hintbox = cell.querySelector('.js-hintbox');
		if (hintbox) {
			return hintbox.textContent;
		}

		// Para barras, procura o valor numérico na célula adjacente
		if (cell.querySelector('.bar-gauge')) {
			const valueCell = cells[actualIndex + 1];
			if (valueCell) {
				const valueDiv = valueCell.querySelector('div');
				return valueDiv ? valueDiv.textContent.trim() : '';
			}
			return '';
		}

		// Caso padrão - retorna o texto da célula
		return cell.textContent.trim();
	}
}
