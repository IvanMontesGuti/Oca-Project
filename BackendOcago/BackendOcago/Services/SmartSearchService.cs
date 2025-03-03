using BackendOcago.Models.Database.Entities;
using F23.StringSimilarity;
using F23.StringSimilarity.Interfaces;
using System.Globalization;
using System.Text;

namespace BackendOcago.Services
{
    public class SmartSearchService
    {
        private const double THRESHOLD = 0.80;
        private readonly INormalizedStringSimilarity _stringSimilarityComparer;

        public SmartSearchService()
        {
            _stringSimilarityComparer = new JaroWinkler();
        }

        public async Task<IEnumerable<User>> SearchUsersAsync(IQueryable<User> users, string searchQuery)
        {
            if (string.IsNullOrWhiteSpace(searchQuery))
            {
                return users.ToList();
            }

            var searchTokens = TokenizeText(ClearText(searchQuery));

            // Forzamos la evaluación en memoria con AsEnumerable() para que los métodos personalizados se ejecuten en C#
            var filteredUsers = users.AsEnumerable()
                                      .Where(user => MatchTokens(searchTokens, TokenizeText(ClearText(user.Nickname))))
                                      .ToList();

            return await Task.FromResult(filteredUsers);
        }


        private bool MatchTokens(string[] queryTokens, string[] userTokens)
        {
            foreach (var userToken in userTokens)
            {
                foreach (var queryToken in queryTokens)
                {
                    if (IsSimilar(userToken, queryToken))
                        return true;
                }
            }
            return false;
        }

        private bool IsSimilar(string userToken, string queryToken)
        {
            return userToken.Contains(queryToken, StringComparison.OrdinalIgnoreCase) ||
                   _stringSimilarityComparer.Similarity(userToken, queryToken) >= THRESHOLD;
        }

        private string[] TokenizeText(string text)
        {
            return text.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        private string ClearText(string text)
        {
            return RemoveDiacritics(text.ToLower());
        }

        private string RemoveDiacritics(string text)
        {
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            return new string(normalizedString.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
        }
    }
}